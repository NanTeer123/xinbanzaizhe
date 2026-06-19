App({
  onLaunch() {
    if (!wx.cloud) {
      console.error('请使用 2.2.3 或以上的基础库以使用云能力')
    } else {
      wx.cloud.init({
        env: 'cloudbase-d1gaoq0lv6e2e5299',
        traceUser: true
      })
    }
    this.initDatabase()
    this.initAdmin()
    this.getOpenId()
  },

  initDatabase() {
    wx.cloud.callFunction({
      name: 'initDB',
      success: res => {
        console.log('数据库初始化完成', res)
      },
      fail: err => {
        console.log('数据库初始化失败，可能已存在', err)
      }
    })
  },

  initAdmin() {
    const db = wx.cloud.database()
    db.collection('users').where({
      username: 'admin'
    }).get({
      success: res => {
        if (res.data.length === 0) {
          db.collection('users').add({
            data: {
              username: 'admin',
              password: '123456',
              name: '超级管理员',
              department: '系统管理部',
              role: 'super_admin',
              roleName: '超级管理员',
              createTime: db.serverDate()
            }
          })
        }
      }
    })
  },

  getOpenId() {
    wx.cloud.callFunction({
      name: 'login',
      data: {},
      success: res => {
        this.globalData.openId = res.result.openid
        this.getUserData()
      },
      fail: err => {
        console.error('[云函数] [login] 调用失败', err)
      }
    })
  },

  getUserData(callback) {
    const db = wx.cloud.database()
    db.collection('users').where({
      _openid: this.globalData.openId
    }).get({
      success: res => {
        if (res.data.length > 0) {
          this.globalData.userData = res.data[0]
          this.globalData.isLoggedIn = true
        } else {
          this.globalData.userData = null
          this.globalData.isLoggedIn = false
        }
        if (callback) callback(this.globalData.userData)
      },
      fail: err => {
        console.error('获取用户信息失败', err)
        if (callback) callback(null)
      }
    })
  },

  checkLoginStatus() {
    return new Promise((resolve) => {
      if (!this.globalData.openId) {
        setTimeout(() => {
          this.checkLoginStatus().then(resolve)
        }, 500)
        return
      }
      if (this.globalData.userData) {
        resolve(true)
      } else {
        resolve(false)
      }
    })
  },

  logout() {
    this.globalData.userData = null
    this.globalData.isLoggedIn = false
    wx.removeStorageSync('userData')
    wx.removeStorageSync('username')
    wx.reLaunch({
      url: '/pages/login/login'
    })
  },

  globalData: {
    userInfo: null,
    openId: null,
    userData: null,
    isLoggedIn: false
  }
})