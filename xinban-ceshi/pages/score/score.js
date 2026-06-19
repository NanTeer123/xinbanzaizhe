const app = getApp()
const db = wx.cloud.database()

Page({
  data: {
    completedTasks: [],
    scores: [],
    showScoreModal: false,
    selectedTask: null,
    selectedTaskTitle: '',
    score: 5,
    comment: '',
    hasTodoTasks: false
  },

  onLoad() {
    this.loadTasks()
    this.loadScores()
  },

  goBack() {
    wx.navigateBack()
  },

  loadTasks() {
    db.collection('tasks').where({
      _openid: app.globalData.openId,
      status: 'completed'
    }).orderBy('completeTime', 'desc').get({
      success: res => {
        const tasks = res.data
        const hasTodo = tasks.some(task => !task.scored)
        this.setData({
          completedTasks: tasks,
          hasTodoTasks: hasTodo
        })
      }
    })
  },

  loadScores() {
    db.collection('scores').orderBy('createTime', 'desc').get({
      success: res => {
        this.setData({
          scores: res.data
        })
      }
    })
  },

  showScoreModal(e) {
    const task = e.currentTarget.dataset.task
    this.setData({
      selectedTask: task,
      selectedTaskTitle: task.title,
      showScoreModal: true,
      score: 5,
      comment: ''
    })
  },

  hideScoreModal() {
    this.setData({
      showScoreModal: false,
      selectedTask: null
    })
  },

  onScoreChange(e) {
    this.setData({
      score: parseInt(e.detail.value)
    })
  },

  onCommentInput(e) {
    this.setData({
      comment: e.detail.value
    })
  },

  submitScore() {
    const { selectedTask, score, comment } = this.data
    if (!comment) {
      wx.showToast({
        title: '请填写评价',
        icon: 'none'
      })
      return
    }

    db.collection('scores').add({
      data: {
        taskId: selectedTask._id,
        taskTitle: selectedTask.title,
        assigneeId: selectedTask.assigneeId,
        assigneeName: selectedTask.assigneeName,
        score: score,
        comment: comment,
        createTime: db.serverDate()
      },
      success: () => {
        wx.showToast({
          title: '评分成功'
        })
        
        db.collection('notifications').add({
          data: {
            type: 'score',
            title: '任务评分',
            content: `您的任务「${selectedTask.title}」获得了 ${score} 星评价`,
            receiverId: selectedTask.assigneeId,
            relatedId: selectedTask._id,
            read: false,
            createTime: db.serverDate()
          }
        })
        
        this.hideScoreModal()
        this.loadScores()
        
        db.collection('tasks').doc(selectedTask._id).update({
          data: {
            scored: true
          }
        })
      }
    })
  },

  getScoreStars(score) {
    return '★'.repeat(score) + '☆'.repeat(5 - score)
  },

  formatDate(date) {
    if (!date) return ''
    const d = new Date(date)
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  }
})
