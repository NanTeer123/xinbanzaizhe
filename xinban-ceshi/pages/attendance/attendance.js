const app = getApp()
const db = wx.cloud.database()

Page({
  data: {
    todayDate: '',
    checkInTime: null,
    checkOutTime: null,
    records: [],
    showLeaveModal: false,
    leaveStart: '',
    leaveEnd: '',
    leaveReason: '',
    imagePath: '',
    location: null
  },

  onLoad() {
    const today = new Date()
    const weekDays = ['日', '一', '二', '三', '四', '五', '六']
    this.setData({
      todayDate: `${today.getFullYear()}年${String(today.getMonth() + 1).padStart(2, '0')}月${String(today.getDate()).padStart(2, '0')}日 星期${weekDays[today.getDay()]}`
    })
    this.loadTodayRecord()
    this.loadRecords()
  },

  onShow() {
    this.loadTodayRecord()
    this.loadRecords()
  },

  loadTodayRecord() {
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
          const record = res.data[0]
          this.setData({
            checkInTime: record.checkInTime,
            checkOutTime: record.checkOutTime
          })
        }
      }
    })
  },

  loadRecords() {
    const userData = app.globalData.userData
    if (!userData) return

    let query = db.collection('clock')
    
    if (userData.role === 'super_admin') {
      query = query.orderBy('date', 'desc').limit(30)
    } else {
      query = query.where({ _openid: app.globalData.openId }).orderBy('date', 'desc').limit(30)
    }

    query.get({
      success: res => {
        this.setData({ records: res.data })
      }
    })
  },

  getLocation() {
    return new Promise((resolve, reject) => {
      wx.getLocation({
        type: 'gcj02',
        success: (res) => {
          this.setData({ location: res })
          resolve(res)
        },
        fail: () => {
          wx.showToast({ title: '获取位置失败', icon: 'none' })
          reject(new Error('获取位置失败'))
        }
      })
    })
  },

  checkIn() {
    wx.showLoading({ title: '打卡中...' })
    
    this.getLocation().then(() => {
      const now = new Date()
      const location = this.data.location
      
      db.collection('clock').add({
        data: {
          date: now,
          checkInTime: now,
          type: 'manual',
          isLeave: false,
          location: {
            latitude: location.latitude,
            longitude: location.longitude
          }
        },
        success: () => {
          wx.hideLoading()
          wx.showToast({ title: '打卡成功', icon: 'success' })
          this.setData({ checkInTime: now })
          this.loadRecords()
        },
        fail: () => {
          wx.hideLoading()
          wx.showToast({ title: '打卡失败', icon: 'none' })
        }
      })
    }).catch(() => {
      wx.hideLoading()
      const now = new Date()
      db.collection('clock').add({
        data: {
          date: now,
          checkInTime: now,
          type: 'manual',
          isLeave: false
        },
        success: () => {
          wx.showToast({ title: '打卡成功', icon: 'success' })
          this.setData({ checkInTime: now })
          this.loadRecords()
        },
        fail: () => {
          wx.showToast({ title: '打卡失败', icon: 'none' })
        }
      })
    })
  },

  photoCheckIn() {
    wx.chooseImage({
      count: 1,
      sourceType: ['album', 'camera'],
      success: (res) => {
        const tempFilePath = res.tempFilePaths[0]
        
        this.getLocation().then(location => {
          wx.showLoading({ title: '上传中...' })
          const cloudPath = `clock_images/${Date.now()}.png`
          
          wx.cloud.uploadFile({
            cloudPath,
            filePath: tempFilePath,
            success: (uploadRes) => {
              const now = new Date()
              db.collection('clock').add({
                data: {
                  date: now,
                  checkInTime: now,
                  type: 'photo',
                  imageUrl: uploadRes.fileID,
                  isLeave: false,
                  location: {
                    latitude: location.latitude,
                    longitude: location.longitude
                  }
                },
                success: () => {
                  wx.hideLoading()
                  wx.showToast({ title: '拍照打卡成功', icon: 'success' })
                  this.setData({ checkInTime: now })
                  this.loadRecords()
                },
                fail: () => {
                  wx.hideLoading()
                  wx.showToast({ title: '打卡失败', icon: 'none' })
                }
              })
            },
            fail: () => {
              wx.hideLoading()
              wx.showToast({ title: '图片上传失败', icon: 'none' })
            }
          })
        }).catch(() => {
          wx.hideLoading()
          wx.showToast({ title: '获取位置失败，使用默认打卡', icon: 'none' })
          const now = new Date()
          wx.cloud.uploadFile({
            cloudPath: `clock_images/${Date.now()}.png`,
            filePath: tempFilePath,
            success: (uploadRes) => {
              db.collection('clock').add({
                data: {
                  date: now,
                  checkInTime: now,
                  type: 'photo',
                  imageUrl: uploadRes.fileID,
                  isLeave: false
                },
                success: () => {
                  wx.showToast({ title: '拍照打卡成功', icon: 'success' })
                  this.setData({ checkInTime: now })
                  this.loadRecords()
                }
              })
            }
          })
        })
      },
      fail: () => {
        wx.showToast({ title: '请选择图片', icon: 'none' })
      }
    })
  },

  checkOut() {
    const now = new Date()
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
          const recordId = res.data[0]._id
          db.collection('clock').doc(recordId).update({
            data: { checkOutTime: now },
            success: () => {
              wx.showToast({ title: '下班打卡成功', icon: 'success' })
              this.setData({ checkOutTime: now })
              this.loadRecords()
            },
            fail: () => {
              wx.showToast({ title: '打卡失败', icon: 'none' })
            }
          })
        }
      }
    })
  },

  showLeaveModal() {
    this.setData({ showLeaveModal: true })
  },

  hideLeaveModal() {
    this.setData({
      showLeaveModal: false,
      leaveStart: '',
      leaveEnd: '',
      leaveReason: ''
    })
  },

  stopPropagation() {
  },

  onLeaveStartChange(e) {
    this.setData({ leaveStart: e.detail.value })
  },

  onLeaveEndChange(e) {
    this.setData({ leaveEnd: e.detail.value })
  },

  onLeaveReasonInput(e) {
    this.setData({ leaveReason: e.detail.value })
  },

  submitLeave() {
    const { leaveStart, leaveEnd, leaveReason } = this.data
    if (!leaveStart) {
      wx.showToast({ title: '请选择开始日期', icon: 'none' })
      return
    }
    if (!leaveEnd) {
      wx.showToast({ title: '请选择结束日期', icon: 'none' })
      return
    }
    if (!leaveReason.trim()) {
      wx.showToast({ title: '请输入请假事由', icon: 'none' })
      return
    }

    wx.showLoading({ title: '提交中...' })
    db.collection('clock').add({
      data: {
        date: new Date(leaveStart),
        type: 'leave',
        isLeave: true,
        leaveStart: new Date(leaveStart),
        leaveEnd: new Date(leaveEnd),
        reason: leaveReason
      },
      success: () => {
        wx.hideLoading()
        wx.showToast({ title: '请假申请提交成功', icon: 'success' })
        this.hideLeaveModal()
        this.loadRecords()
      },
      fail: () => {
        wx.hideLoading()
        wx.showToast({ title: '提交失败', icon: 'none' })
      }
    })
  },

  formatTime(date) {
    if (!date) return ''
    const d = new Date(date)
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
  },

  formatDate(date) {
    const d = new Date(date)
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  }
})