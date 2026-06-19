const app = getApp()
const db = wx.cloud.database()

Page({
  data: {
    userData: null,
    departments: [],
    deptNames: [],
    users: [],
    expandedDepts: [],
    showAddModal: false,
    isEdit: false,
    roleOptions: ['普通员工', '部门管理员'],
    newUser: {
      name: '',
      username: '',
      password: '',
      department: '',
      role: 'employee',
      roleName: '普通员工'
    }
  },

  onLoad() {
    this.getUserData()
    this.loadData()
  },

  onShow() {
    this.loadData()
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

  loadData() {
    db.collection('dept').get({
      success: res => {
        const depts = res.data.length > 0 ? res.data : [
          { name: '技术部' },
          { name: '市场部' },
          { name: '财务部' },
          { name: '人力资源部' },
          { name: '运营部' }
        ]
        this.setData({ 
          departments: depts,
          deptNames: depts.map(d => d.name)
        })
        this.loadUsers()
      }
    })
  },

  loadUsers() {
    const userData = this.data.userData
    if (!userData) return
    
    let query = db.collection('users')
    
    if (userData.role === 'super_admin') {
      query = query.orderBy('department').orderBy('role', 'desc')
    } else if (userData.role === 'dept_admin') {
      query = query.where({ department: userData.department }).orderBy('role', 'desc')
    } else {
      query = query.where({ department: userData.department }).orderBy('role', 'desc')
    }

    query.get({
      success: res => {
        this.setData({ users: res.data })
      }
    })
  },

  toggleDept(e) {
    const name = e.currentTarget.dataset.name
    const expandedDepts = this.data.expandedDepts.includes(name)
      ? this.data.expandedDepts.filter(d => d !== name)
      : [...this.data.expandedDepts, name]
    this.setData({ expandedDepts })
  },

  getDeptUsers(deptName) {
    return this.data.users.filter(u => u.department === deptName)
  },

  viewUser(e) {
    const user = e.currentTarget.dataset.user
    wx.showModal({
      title: user.name,
      content: `部门：${user.department}\n角色：${user.roleName}`,
      showCancel: false
    })
  },

  showAddModal() {
    this.setData({ 
      showAddModal: true,
      isEdit: false,
      newUser: {
        name: '',
        username: '',
        password: '',
        department: '',
        role: 'employee',
        roleName: '普通员工'
      }
    })
  },

  hideAddModal() {
    this.setData({ showAddModal: false })
  },

  stopPropagation() {
  },

  onNameInput(e) {
    this.setData({ 'newUser.name': e.detail.value })
  },

  onUsernameInput(e) {
    this.setData({ 'newUser.username': e.detail.value })
  },

  onPasswordInput(e) {
    this.setData({ 'newUser.password': e.detail.value })
  },

  onDepartmentChange(e) {
    this.setData({ 'newUser.department': this.data.deptNames[e.detail.value] })
  },

  onRoleChange(e) {
    const roles = ['普通员工', '部门管理员']
    const roleNames = ['employee', 'dept_admin']
    this.setData({ 
      'newUser.roleName': roles[e.detail.value],
      'newUser.role': roleNames[e.detail.value]
    })
  },

  saveUser() {
    const { name, username, password, department, role, roleName } = this.data.newUser
    if (!name.trim()) {
      wx.showToast({ title: '请输入姓名', icon: 'none' })
      return
    }
    if (!username.trim()) {
      wx.showToast({ title: '请输入账号', icon: 'none' })
      return
    }
    if (!password) {
      wx.showToast({ title: '请输入密码', icon: 'none' })
      return
    }
    if (!department) {
      wx.showToast({ title: '请选择部门', icon: 'none' })
      return
    }

    db.collection('users').where({ username }).get({
      success: res => {
        if (res.data.length > 0 && !this.data.isEdit) {
          wx.showToast({ title: '账号已存在', icon: 'none' })
          return
        }

        db.collection('users').add({
          data: {
            name,
            username,
            password,
            department,
            role,
            roleName,
            createTime: db.serverDate()
          },
          success: () => {
            wx.showToast({ title: '添加成功', icon: 'success' })
            this.hideAddModal()
            this.loadUsers()
          },
          fail: () => {
            wx.showToast({ title: '添加失败', icon: 'none' })
          }
        })
      },
      fail: () => {
        wx.showToast({ title: '操作失败', icon: 'none' })
      }
    })
  }
})