const app = getApp()
const db = wx.cloud.database()

Page({
  data: {
    loginType: 'login',
    username: '',
    password: '',
    name: '',
    department: '',
    departments: [],
    isLoading: false
  },

  onLoad() {
    const cachedUsername = wx.getStorageSync('username')
    if (cachedUsername) {
      this.setData({ username: cachedUsername })
    }
    this.loadDepartments()
  },

  loadDepartments() {
    db.collection('dept').get({
      success: res => {
        const depts = res.data.map(d => d.name)
        if (depts.length === 0) {
          depts.push('技术部', '市场部', '财务部', '人力资源部', '运营部')
        }
        this.setData({ departments: depts })
      },
      fail: () => {
        this.setData({ departments: ['技术部', '市场部', '财务部', '人力资源部', '运营部'] })
      }
    })
  },

  switchToLogin() {
    this.setData({ loginType: 'login' })
  },

  switchToRegister() {
    this.setData({ loginType: 'register' })
  },

  onUsernameInput(e) {
    this.setData({ username: e.detail.value })
  },

  onPasswordInput(e) {
    this.setData({ password: e.detail.value })
  },

  onNameInput(e) {
    this.setData({ name: e.detail.value })
  },

  onDepartmentChange(e) {
    this.setData({ department: this.data.departments[e.detail.value] })
  },

  login() {
    const { username, password } = this.data
    if (!username.trim()) {
      wx.showToast({ title: '请输入账号', icon: 'none' })
      return
    }
    if (!password) {
      wx.showToast({ title: '请输入密码', icon: 'none' })
      return
    }

    this.setData({ isLoading: true })

    db.collection('users').where({ username }).get({
      success: res => {
        if (res.data.length > 0) {
          const user = res.data[0]
          if (user.password === password) {
            wx.setStorageSync('username', username)
            wx.setStorageSync('userData', user)
            app.globalData.userData = user
            app.globalData.isLoggedIn = true
            
            wx.showToast({ title: '登录成功', icon: 'success' })
            setTimeout(() => {
              wx.switchTab({ url: '/pages/index/index' })
            }, 1000)
          } else {
            wx.showToast({ title: '密码错误', icon: 'none' })
          }
        } else {
          wx.showToast({ title: '用户不存在', icon: 'none' })
        }
        this.setData({ isLoading: false })
      },
      fail: () => {
        wx.showToast({ title: '登录失败，请重试', icon: 'none' })
        this.setData({ isLoading: false })
      }
    })
  },

  register() {
    const { username, password, name, department } = this.data
    if (!username.trim()) {
      wx.showToast({ title: '请输入账号', icon: 'none' })
      return
    }
    if (!password) {
      wx.showToast({ title: '请输入密码', icon: 'none' })
      return
    }
    if (!name.trim()) {
      wx.showToast({ title: '请输入姓名', icon: 'none' })
      return
    }
    if (!department) {
      wx.showToast({ title: '请选择部门', icon: 'none' })
      return
    }

    this.setData({ isLoading: true })

    db.collection('users').where({ username }).get({
      success: res => {
        if (res.data.length > 0) {
          wx.showToast({ title: '账号已存在', icon: 'none' })
          this.setData({ isLoading: false })
          return
        }

        db.collection('users').add({
          data: {
            username,
            password,
            name,
            department,
            role: 'employee',
            roleName: '普通员工',
            createTime: db.serverDate()
          },
          success: () => {
            wx.showToast({ title: '注册成功', icon: 'success' })
            setTimeout(() => {
              this.setData({
                loginType: 'login',
                password: '',
                name: '',
                department: '',
                isLoading: false
              })
            }, 1000)
          },
          fail: () => {
            wx.showToast({ title: '注册失败，请重试', icon: 'none' })
            this.setData({ isLoading: false })
          }
        })
      },
      fail: () => {
        wx.showToast({ title: '注册失败，请重试', icon: 'none' })
        this.setData({ isLoading: false })
      }
    })
  }
})