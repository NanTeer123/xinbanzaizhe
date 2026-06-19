const app = getApp()
const db = wx.cloud.database()

Page({
  data: {
    tasks: [],
    myTasks: [],
    users: [],
    showAddModal: false,
    showProgressModal: false,
    selectedTask: null,
    newTask: {
      title: '',
      description: '',
      assigneeId: '',
      deadline: '',
      phases: [{ name: '阶段1', completed: false }],
      phaseInterval: '3'
    },
    assigneeName: '请选择负责人',
    progressReport: '',
    reason: '',
    activeTab: 0,
    isAdmin: false,
    images: [],
    maxImages: 9
  },

  onLoad() {
    this.checkAdmin()
    this.loadUsers()
    this.loadTasks()
  },

  checkAdmin() {
    const userData = app.globalData.userData
    if (userData && (userData.isAdmin || userData.role === '总经理')) {
      this.setData({ isAdmin: true })
    }
  },

  goBack() {
    wx.navigateBack()
  },

  loadUsers() {
    db.collection('users').get({
      success: res => {
        this.setData({
          users: res.data
        })
      }
    })
  },

  loadTasks() {
    const query = this.data.isAdmin ? {} : { _openid: app.globalData.openId }
    
    db.collection('tasks').where(query).orderBy('createTime', 'desc').get({
      success: res => {
        this.setData({
          tasks: res.data
        })
      }
    })

    db.collection('tasks').where({
      assigneeId: app.globalData.openId
    }).orderBy('createTime', 'desc').get({
      success: res => {
        this.setData({
          myTasks: res.data
        })
      }
    })
  },

  switchTab(e) {
    this.setData({
      activeTab: e.currentTarget.dataset.index
    })
  },

  showAddModal() {
    if (!this.data.isAdmin) {
      wx.showToast({
        title: '无权限操作',
        icon: 'none'
      })
      return
    }
    this.setData({
      showAddModal: true
    })
  },

  hideAddModal() {
    this.setData({
      showAddModal: false,
      newTask: {
        title: '',
        description: '',
        assigneeId: '',
        deadline: '',
        phases: [{ name: '阶段1', completed: false }],
        phaseInterval: '3'
      },
      assigneeName: '请选择负责人'
    })
  },

  onTitleInput(e) {
    this.setData({
      'newTask.title': e.detail.value
    })
  },

  onDescriptionInput(e) {
    this.setData({
      'newTask.description': e.detail.value
    })
  },

  onAssigneeChange(e) {
    const index = e.detail.value
    this.setData({
      'newTask.assigneeId': this.data.users[index]._id,
      assigneeName: this.data.users[index].name
    })
  },

  onDeadlineChange(e) {
    this.setData({
      'newTask.deadline': e.detail.value
    })
  },

  onPhaseIntervalChange(e) {
    this.setData({
      'newTask.phaseInterval': e.detail.value || '3'
    })
  },

  addPhase() {
    const phases = this.data.newTask.phases
    phases.push({ name: `阶段${phases.length + 1}`, completed: false })
    this.setData({
      'newTask.phases': phases
    })
  },

  onPhaseNameInput(e) {
    const index = e.currentTarget.dataset.index
    const phases = this.data.newTask.phases.slice()
    const phase = { ...phases[index], name: e.detail.value }
    phases[index] = phase
    this.setData({
      'newTask.phases': phases
    })
  },

  createTask() {
    if (!this.data.isAdmin) {
      wx.showToast({
        title: '无权限操作',
        icon: 'none'
      })
      return
    }

    const { title, description, assigneeId, deadline, phases, phaseInterval } = this.data.newTask
    if (!title || !assigneeId || !deadline) {
      wx.showToast({
        title: '请填写必填信息',
        icon: 'none'
      })
      return
    }

    const assignee = this.data.users.find(u => u._id === assigneeId)
    db.collection('tasks').add({
      data: {
        title,
        description,
        assigneeId,
        assigneeName: assignee.name,
        deadline: new Date(deadline),
        phases,
        phaseInterval: parseInt(phaseInterval) || 3,
        status: 'in_progress',
        createTime: db.serverDate(),
        progressHistory: []
      },
      success: (res) => {
        wx.showToast({
          title: '任务创建成功'
        })
        
        db.collection('notifications').add({
          data: {
            type: 'task',
            title: '新任务分配',
            content: `${app.globalData.userData?.name || '新用户'} 给您分配了任务「${title}」，每${parseInt(phaseInterval) || 3}天需要提交一次进度汇报`,
            receiverId: assigneeId,
            relatedId: res._id,
            read: false,
            createTime: db.serverDate()
          }
        })
        
        this.hideAddModal()
        this.loadTasks()
      }
    })
  },

  showProgressModal(e) {
    const task = e.currentTarget.dataset.task
    this.setData({
      selectedTask: task,
      showProgressModal: true,
      progressReport: '',
      reason: '',
      images: []
    })
  },

  hideProgressModal() {
    this.setData({
      showProgressModal: false,
      selectedTask: null,
      images: []
    })
  },



  onProgressInput(e) {
    this.setData({
      progressReport: e.detail.value
    })
  },

  onReasonInput(e) {
    this.setData({
      reason: e.detail.value
    })
  },

  chooseImage() {
    const remaining = this.data.maxImages - this.data.images.length
    if (remaining <= 0) {
      wx.showToast({
        title: '最多上传9张图片',
        icon: 'none'
      })
      return
    }

    wx.chooseImage({
      count: remaining,
      sizeType: ['compressed'],
      sourceType: ['album', 'camera'],
      success: (res) => {
        const tempFilePaths = res.tempFilePaths
        const newImages = [...this.data.images, ...tempFilePaths]
        this.setData({
          images: newImages
        })
      }
    })
  },

  previewImage(e) {
    const index = e.currentTarget.dataset.index
    wx.previewImage({
      urls: this.data.images,
      current: this.data.images[index]
    })
  },

  deleteImage(e) {
    const index = e.currentTarget.dataset.index
    const newImages = this.data.images.filter((_, i) => i !== index)
    this.setData({
      images: newImages
    })
  },

  uploadImages() {
    return new Promise((resolve) => {
      const uploadPromises = []
      const uploadedUrls = []

      this.data.images.forEach((imagePath, index) => {
        const promise = new Promise((resolve) => {
          const cloudPath = `task_images/${Date.now()}_${index}.png`
          wx.cloud.uploadFile({
            cloudPath: cloudPath,
            filePath: imagePath,
            success: (res) => {
              uploadedUrls.push(res.fileID)
              resolve()
            },
            fail: () => {
              resolve()
            }
          })
        })
        uploadPromises.push(promise)
      })

      Promise.all(uploadPromises).then(() => {
        resolve(uploadedUrls)
      })
    })
  },

  submitProgress() {
    const { selectedTask, progressReport, reason } = this.data
    if (!progressReport) {
      wx.showToast({
        title: '请填写进度报告',
        icon: 'none'
      })
      return
    }

    wx.showLoading({
      title: '提交中...'
    })

    this.uploadImages().then(imageUrls => {
      const updates = {
        progressHistory: db.command.push({
          report: progressReport,
          reason: reason,
          images: imageUrls,
          time: db.serverDate()
        })
      }

      db.collection('tasks').doc(selectedTask._id).update({
        data: updates,
        success: () => {
          wx.hideLoading()
          wx.showToast({
            title: '进度已更新'
          })
          
          if (selectedTask._openid) {
            db.collection('notifications').add({
              data: {
                type: 'task',
                title: '任务进度更新',
                content: `${selectedTask.assigneeName} 更新了任务「${selectedTask.title}」的进度`,
                receiverId: selectedTask._openid,
                relatedId: selectedTask._id,
                read: false,
                createTime: db.serverDate()
              }
            })
          }
          
          this.hideProgressModal()
          this.loadTasks()
        },
        fail: () => {
          wx.hideLoading()
          wx.showToast({
            title: '提交失败，请重试',
            icon: 'none'
          })
        }
      })
    })
  },

  togglePhase(e) {
    const taskId = e.currentTarget.dataset.taskid
    const phaseIndex = e.currentTarget.dataset.index
    const task = this.data.myTasks.find(t => t._id === taskId) || this.data.tasks.find(t => t._id === taskId)
    
    if (!task) return

    if (task.assigneeId !== app.globalData.openId && !this.data.isAdmin) {
      wx.showToast({
        title: '无权限操作',
        icon: 'none'
      })
      return
    }

    const phases = [...task.phases]
    phases[phaseIndex].completed = !phases[phaseIndex].completed

    db.collection('tasks').doc(taskId).update({
      data: {
        phases: phases
      },
      success: () => {
        wx.showToast({
          title: phases[phaseIndex].completed ? '阶段已完成' : '阶段已取消'
        })
        this.loadTasks()
      }
    })
  },

  completeTask(e) {
    const id = e.currentTarget.dataset.id
    const task = this.data.myTasks.find(t => t._id === id) || this.data.tasks.find(t => t._id === id)
    
    if (task.assigneeId !== app.globalData.openId && !this.data.isAdmin) {
      wx.showToast({
        title: '无权限操作',
        icon: 'none'
      })
      return
    }

    db.collection('tasks').doc(id).update({
      data: {
        status: 'completed',
        completeTime: db.serverDate()
      },
      success: () => {
        wx.showToast({
          title: '任务已完成'
        })
        
        if (task && task._openid) {
          db.collection('notifications').add({
            data: {
              type: 'task',
              title: '任务完成',
              content: `${task.assigneeName} 完成了任务「${task.title}」`,
              receiverId: task._openid,
              relatedId: id,
              read: false,
              createTime: db.serverDate()
            }
          })
        }
        
        this.loadTasks()
      }
    })
  },

  deleteTask(e) {
    if (!this.data.isAdmin) {
      wx.showToast({
        title: '无权限操作',
        icon: 'none'
      })
      return
    }

    const id = e.currentTarget.dataset.id
    wx.showModal({
      title: '确认删除',
      content: '确定要删除该任务吗？',
      success: res => {
        if (res.confirm) {
          db.collection('tasks').doc(id).remove({
            success: () => {
              wx.showToast({
                title: '删除成功'
              })
              this.loadTasks()
            }
          })
        }
      }
    })
  },

  getStatusText(status) {
    const map = {
      in_progress: '进行中',
      completed: '已完成',
      delayed: '已延期'
    }
    return map[status] || status
  },

  getStatusClass(status) {
    const map = {
      in_progress: 'text-primary',
      completed: 'text-success',
      delayed: 'text-danger'
    }
    return map[status] || ''
  },

  formatDate(date) {
    if (!date) return ''
    const d = new Date(date)
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  },

  formatDateTime(date) {
    if (!date) return ''
    const d = new Date(date)
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
  }
})
