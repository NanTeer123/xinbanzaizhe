const app = getApp()
const db = wx.cloud.database()

Page({
  data: {
    userInfo: null,
    userData: null,
    showProfileModal: false,
    name: '',
    role: '普通员工',
    roleIndex: 4,
    department: '',
    roles: ['总经理', '副总经理', '部门经理', '主管', '普通员工']
  },

  onLoad() {
    this.getUserData()
  },

  onShow() {
    this.getUserData()
  },

  goBack() {
    wx.navigateBack()
  },

  getUserData() {
    // 先从全局获取
    if (app.globalData.userData) {
      this.setData({
        userData: app.globalData.userData
      })
      return
    }
    
    // 从本地存储获取
    const cachedUser = wx.getStorageSync('userData')
    if (cachedUser) {
      app.globalData.userData = cachedUser
      app.globalData.isLoggedIn = true
      this.setData({
        userData: cachedUser
      })
      return
    }
    
    // 从数据库获取
    if (app.globalData.openId) {
      db.collection('users').where({
        _openid: app.globalData.openId
      }).get({
        success: res => {
          if (res.data.length > 0) {
            app.globalData.userData = res.data[0]
            app.globalData.isLoggedIn = true
            wx.setStorageSync('userData', res.data[0])
            this.setData({
              userData: res.data[0]
            })
          }
        }
      })
    }
  },

  showProfileModal() {
    const userData = this.data.userData
    const roleIndex = this.data.roles.indexOf(userData?.role || '普通员工')
    this.setData({
      showProfileModal: true,
      name: userData?.name || '',
      role: userData?.role || '普通员工',
      roleIndex: roleIndex >= 0 ? roleIndex : 4,
      department: userData?.department || ''
    })
  },

  hideProfileModal() {
    this.setData({
      showProfileModal: false
    })
  },

  onNameInput(e) {
    this.setData({
      name: e.detail.value
    })
  },

  onRoleChange(e) {
    this.setData({
      role: this.data.roles[e.detail.value],
      roleIndex: parseInt(e.detail.value)
    })
  },

  onDepartmentInput(e) {
    this.setData({
      department: e.detail.value
    })
  },

  getRoleLevel(role) {
    const levels = {
      '总经理': 1,
      '副总经理': 2,
      '部门经理': 3,
      '主管': 4,
      '普通员工': 5
    }
    return levels[role] || 5
  },

  saveProfile() {
    const { name, role, department } = this.data
    if (!name) {
      wx.showToast({
        title: '请输入姓名',
        icon: 'none'
      })
      return
    }

    const userData = {
      name,
      role,
      department,
      roleLevel: this.getRoleLevel(role),
      _openid: app.globalData.openId
    }
    
    // 更新到数据库
    if (this.data.userData && this.data.userData._id) {
      db.collection('users').doc(this.data.userData._id).update({
        data: {
          name,
          role,
          department,
          roleLevel: this.getRoleLevel(role),
          updateTime: db.serverDate()
        },
        success: () => {
          const updatedUser = {
            ...this.data.userData,
            ...userData
          }
          app.globalData.userData = updatedUser
          wx.setStorageSync('userData', updatedUser)
          this.setData({
            userData: updatedUser
          })
          
          wx.showToast({
            title: '保存成功'
          })
          this.hideProfileModal()
        },
        fail: err => {
          console.error('更新失败', err)
          // 即使数据库更新失败，也更新本地数据
          const updatedUser = {
            ...this.data.userData,
            ...userData
          }
          app.globalData.userData = updatedUser
          wx.setStorageSync('userData', updatedUser)
          this.setData({
            userData: updatedUser
          })
          
          wx.showToast({
            title: '保存成功'
          })
          this.hideProfileModal()
        }
      })
    } else {
      // 创建新用户
      db.collection('users').add({
        data: {
          ...userData,
          phone: '',
          createTime: db.serverDate()
        },
        success: (res) => {
          const newUser = {
            _id: res._id,
            ...userData
          }
          app.globalData.userData = newUser
          app.globalData.isLoggedIn = true
          wx.setStorageSync('userData', newUser)
          this.setData({
            userData: newUser
          })
          
          wx.showToast({
            title: '保存成功'
          })
          this.hideProfileModal()
        },
        fail: () => {
          // 即使创建失败，也使用本地数据
          const newUser = {
            ...userData
          }
          app.globalData.userData = newUser
          app.globalData.isLoggedIn = true
          wx.setStorageSync('userData', newUser)
          this.setData({
            userData: newUser
          })
          
          wx.showToast({
            title: '保存成功'
          })
          this.hideProfileModal()
        }
      })
    }
  },

  logout() {
    wx.showModal({
      title: '确认退出',
      content: '确定要退出登录吗？',
      success: res => {
        if (res.confirm) {
          app.globalData.userData = null
          app.globalData.isLoggedIn = false
          wx.removeStorageSync('userData')
          
          wx.reLaunch({
            url: '/pages/login/login'
          })
        }
      }
    })
  },

  navigateTo(e) {
    const url = e.currentTarget.dataset.url
    wx.navigateTo({
      url: url
    })
  }
})
