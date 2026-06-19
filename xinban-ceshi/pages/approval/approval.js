const app = getApp()
const db = wx.cloud.database()

Page({
  data: {
    activeTab: 0,
    approvals: [],
    showAddModal: false,
    newApproval: {
      title: '',
      content: ''
    },
    images: []
  },

  onLoad() {
    this.loadApprovals()
  },

  onShow() {
    this.loadApprovals()
  },

  loadApprovals() {
    const userData = app.globalData.userData
    if (!userData) {
      wx.showToast({ title: '请先登录', icon: 'none' })
      return
    }

    let query = db.collection('approve')

    switch (this.data.activeTab) {
      case 0:
        if (userData.role === 'super_admin') {
          query = query.orderBy('createTime', 'desc')
        } else if (userData.role === 'dept_admin') {
          query = query.where({ department: userData.department }).orderBy('createTime', 'desc')
        } else {
          query = query.where({ _openid: app.globalData.openId }).orderBy('createTime', 'desc')
        }
        break
      case 1:
        if (userData.role === 'super_admin') {
          query = query.where({ status: 'pending' }).orderBy('createTime', 'desc')
        } else if (userData.role === 'dept_admin') {
          query = query.where({ status: 'pending', department: userData.department }).orderBy('createTime', 'desc')
        } else {
          query = query.where({ status: 'pending', approverId: app.globalData.openId }).orderBy('createTime', 'desc')
        }
        break
      case 2:
        query = query.where({ _openid: app.globalData.openId }).orderBy('createTime', 'desc')
        break
      case 3:
        if (userData.role === 'super_admin') {
          query = query.where({ status: db.command.in(['approved', 'rejected']) }).orderBy('createTime', 'desc')
        } else if (userData.role === 'dept_admin') {
          query = query.where({ 
            status: db.command.in(['approved', 'rejected']),
            department: userData.department 
          }).orderBy('createTime', 'desc')
        } else {
          query = query.where({ 
            _openid: app.globalData.openId,
            status: db.command.in(['approved', 'rejected']) 
          }).orderBy('createTime', 'desc')
        }
        break
    }

    query.get({
      success: res => {
        this.setData({ approvals: res.data })
      },
      fail: () => {
        wx.showToast({ title: '加载失败', icon: 'none' })
      }
    })
  },

  switchTab(e) {
    this.setData({ activeTab: parseInt(e.currentTarget.dataset.index) })
    this.loadApprovals()
  },

  canApprove(item) {
    const userData = app.globalData.userData
    if (!userData) return false
    if (userData.role === 'super_admin') return true
    if (userData.role === 'dept_admin' && item.department === userData.department) return true
    return item.approverId === app.globalData.openId
  },

  showAddModal() {
    this.setData({ showAddModal: true })
  },

  hideAddModal() {
    this.setData({
      showAddModal: false,
      newApproval: { title: '', content: '' },
      images: []
    })
  },

  onTitleInput(e) {
    this.setData({ 'newApproval.title': e.detail.value })
  },

  onContentInput(e) {
    this.setData({ 'newApproval.content': e.detail.value })
  },

  chooseImage() {
    const remaining = 9 - this.data.images.length
    wx.chooseImage({
      count: remaining,
      sourceType: ['album', 'camera'],
      success: (res) => {
        this.setData({ images: [...this.data.images, ...res.tempFilePaths] })
      },
      fail: () => {
        wx.showToast({ title: '选择图片失败', icon: 'none' })
      }
    })
  },

  deleteImage(e) {
    const index = e.currentTarget.dataset.index
    const newImages = this.data.images.filter((_, i) => i !== index)
    this.setData({ images: newImages })
  },

  uploadImages() {
    return new Promise((resolve) => {
      if (this.data.images.length === 0) {
        resolve([])
        return
      }
      const uploadPromises = []
      const urls = []
      this.data.images.forEach((path, index) => {
        uploadPromises.push(new Promise((res) => {
          wx.cloud.uploadFile({
            cloudPath: `approval_images/${Date.now()}_${index}.png`,
            filePath: path,
            success: (r) => { urls.push(r.fileID); res() },
            fail: () => res()
          })
        }))
      })
      Promise.all(uploadPromises).then(() => resolve(urls))
    })
  },

  submitApproval() {
    const { title, content } = this.data.newApproval
    if (!title.trim()) {
      wx.showToast({ title: '请输入审批标题', icon: 'none' })
      return
    }
    if (!content.trim()) {
      wx.showToast({ title: '请输入审批详情', icon: 'none' })
      return
    }

    wx.showLoading({ title: '提交中...' })

    this.uploadImages().then(images => {
      const userData = app.globalData.userData
      db.collection('approve').add({
        data: {
          title,
          content,
          images,
          applicantId: app.globalData.openId,
          applicantName: userData.name,
          department: userData.department,
          status: 'pending',
          createTime: db.serverDate()
        },
        success: () => {
          wx.hideLoading()
          wx.showToast({ title: '提交成功', icon: 'success' })
          this.hideAddModal()
          this.loadApprovals()
        },
        fail: () => {
          wx.hideLoading()
          wx.showToast({ title: '提交失败', icon: 'none' })
        }
      })
    })
  },

  approveApproval(e) {
    const id = e.currentTarget.dataset.id
    db.collection('approve').doc(id).update({
      data: { status: 'approved', approveTime: db.serverDate() },
      success: () => {
        wx.showToast({ title: '审批通过', icon: 'success' })
        this.loadApprovals()
      },
      fail: () => {
        wx.showToast({ title: '操作失败', icon: 'none' })
      }
    })
  },

  rejectApproval(e) {
    const id = e.currentTarget.dataset.id
    db.collection('approve').doc(id).update({
      data: { status: 'rejected', approveTime: db.serverDate() },
      success: () => {
        wx.showToast({ title: '已驳回', icon: 'success' })
        this.loadApprovals()
      },
      fail: () => {
        wx.showToast({ title: '操作失败', icon: 'none' })
      }
    })
  },

  previewImage(e) {
    const url = e.currentTarget.dataset.url
    wx.previewImage({ urls: [url], current: url })
  },

  getStatusText(status) {
    const map = { pending: '待审核', approved: '已通过', rejected: '已驳回' }
    return map[status] || status
  },

  formatDate(date) {
    const d = new Date(date)
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
  }
})