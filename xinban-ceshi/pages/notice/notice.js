const app = getApp()
const db = wx.cloud.database()

Page({
  data: {
    userData: null,
    notices: [],
    showAddModal: false,
    newNotice: {
      content: '',
      scope: 'all'
    }
  },

  onLoad() {
    this.getUserData()
    this.loadNotices()
  },

  onShow() {
    this.loadNotices()
  },

  getUserData() {
    if (app.globalData.userData) {
      this.setData({ userData: app.globalData.userData })
    } else {
      const cached = wx.getStorageSync('userData')
      if (cached) {
        app.globalData.userData = cached
        this.setData({ userData: cached })
      }
    }
  },

  loadNotices() {
    db.collection('notice').orderBy('createTime', 'desc').get({
      success: res => {
        this.setData({ notices: res.data })
      }
    })
  },

  showAddModal() {
    this.setData({ showAddModal: true })
  },

  hideAddModal() {
    this.setData({
      showAddModal: false,
      newNotice: { content: '', scope: 'all' }
    })
  },

  onContentInput(e) {
    this.setData({ 'newNotice.content': e.detail.value })
  },

  onScopeChange(e) {
    const scopes = ['all', 'tech', 'market', 'finance', 'hr', 'operations']
    this.setData({ 'newNotice.scope': scopes[e.detail.value] })
  },

  submitNotice() {
    const { content, scope } = this.data.newNotice
    if (!content.trim()) {
      wx.showToast({ title: '请输入公告内容', icon: 'none' })
      return
    }

    const userData = this.data.userData
    db.collection('notice').add({
      data: {
        content,
        scope,
        publisher: userData.name,
        publisherId: app.globalData.openId,
        createTime: db.serverDate()
      },
      success: () => {
        wx.showToast({ title: '发布成功', icon: 'success' })
        this.hideAddModal()
        this.loadNotices()
      },
      fail: () => {
        wx.showToast({ title: '发布失败', icon: 'none' })
      }
    })
  },

  formatDate(date) {
    const d = new Date(date)
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
  }
})