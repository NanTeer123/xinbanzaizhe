const app = getApp()
const db = wx.cloud.database()

Page({
  data: {
    users: [],
    roles: ['总经理', '副总经理', '部门经理', '主管', '普通员工'],
    showAddModal: false,
    newUser: {
      name: '',
      role: '普通员工',
      department: '',
      password: ''
    },
    isAdmin: false
  },

  onLoad() {
    this.checkAdmin()
    this.loadUsers()
  },

  goBack() {
    wx.navigateBack()
  },

  checkAdmin() {
    const userData = app.globalData.userData
    if (userData && (userData.isAdmin || userData.role === '总经理')) {
      this.setData({ isAdmin: true })
    }
  },

  loadUsers() {
    db.collection('users').orderBy('roleLevel', 'asc').get({
      success: res => {
        this.setData({
          users: res.data
        })
      }
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
      newUser: {
        name: '',
        role: '普通员工',
        department: '',
        password: ''
      }
    })
  },

  onNameInput(e) {
    this.setData({
      'newUser.name': e.detail.value
    })
  },

  onRoleChange(e) {
    this.setData({
      'newUser.role': this.data.roles[e.detail.value]
    })
  },

  onDepartmentInput(e) {
    this.setData({
      'newUser.department': e.detail.value
    })
  },

  onPasswordInput(e) {
    this.setData({
      'newUser.password': e.detail.value
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

  addUser() {
    const { name, role, department, password } = this.data.newUser
    if (!name) {
      wx.showToast({
        title: '请输入姓名',
        icon: 'none'
      })
      return
    }

    db.collection('users').add({
      data: {
        name,
        role,
        department,
        password: password || '',
        roleLevel: this.getRoleLevel(role),
        isAdmin: false,
        createTime: db.serverDate()
      },
      success: () => {
        wx.showToast({
          title: '添加成功'
        })
        this.hideAddModal()
        this.loadUsers()
      }
    })
  },

  deleteUser(e) {
    if (!this.data.isAdmin) {
      wx.showToast({
        title: '无权限操作',
        icon: 'none'
      })
      return
    }

    const id = e.currentTarget.dataset.id
    const user = this.data.users.find(u => u._id === id)
    
    // 不能删除自己
    if (user && user._openid === app.globalData.openId) {
      wx.showToast({
        title: '不能删除自己',
        icon: 'none'
      })
      return
    }

    wx.showModal({
      title: '确认删除',
      content: '确定要删除该员工吗？',
      success: res => {
        if (res.confirm) {
          db.collection('users').doc(id).remove({
            success: () => {
              wx.showToast({
                title: '删除成功'
              })
              this.loadUsers()
            }
          })
        }
      }
    })
  }
})
