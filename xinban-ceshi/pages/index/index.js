const app = getApp()
const db = wx.cloud.database()

Page({
  data: {
    userData: null,
    currentDate: '',
    todayChecked: false,
    pendingCount: 0,
    noticeCount: 0,
    notices: []
  },

  onLoad() {
    this.setCurrentDate()
    this.getUserData()
  },

  onShow() {
    this.loadStats()
    this.loadNotices()
  },

  setCurrentDate() {
    const today = new Date()
    const weekDays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']
    const dateStr = `${today.getFullYear()}年${String(today.getMonth() + 1).padStart(2, '0')}月${String(today.getDate()).padStart(2, '0')}日 ${weekDays[today.getDay()]}`
    this.setData({ currentDate: dateStr })
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

  loadStats() {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)

    db.collection('clock').where({
      _openid: app.globalData.openId,
      date: db.command.gte(today).and(db.command.lt(tomorrow))
    }).get({
      success: res => {
        if (res.data.length > 0) {
          this.setData({ todayChecked: true })
        }
      }
    })

    const userData = this.data.userData
    if (userData) {
      if (userData.role === 'super_admin') {
        db.collection('approve').where({ status: 'pending' }).count().then(res => {
          this.setData({ pendingCount: res.total })
        })
      } else if (userData.role === 'dept_admin') {
        db.collection('approve').where({
          status: 'pending',
          department: userData.department
        }).count().then(res => {
          this.setData({ pendingCount: res.total })
        })
      }
    }

    db.collection('notice').orderBy('createTime', 'desc').count().then(res => {
      this.setData({ noticeCount: res.total })
    })
  },

  loadNotices() {
    db.collection('notice').orderBy('createTime', 'desc').get({
      success: res => {
        this.setData({ notices: res.data.slice(0, 3) })
      }
    })
  },

  navigateTo(e) {
    const url = e.currentTarget.dataset.url
    wx.navigateTo({ url })
  },

  logout() {
    wx.showModal({
      title: '确认退出',
      content: '确定要退出登录吗？',
      success: res => {
        if (res.confirm) {
          app.logout()
        }
      }
    })
  },

  formatDate(date) {
    if (!date) return ''
    const d = new Date(date)
    return `${d.getMonth() + 1}/${d.getDate()}`
  }
})