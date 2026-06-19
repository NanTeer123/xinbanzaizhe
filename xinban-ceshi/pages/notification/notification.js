const app = getApp()
const db = wx.cloud.database()

Page({
  data: {
    notifications: [],
    unreadCount: 0
  },

  onLoad() {
    this.loadNotifications()
  },

  goBack() {
    wx.navigateBack()
  },

  loadNotifications() {
    db.collection('notifications').where({
      receiverId: app.globalData.openId
    }).orderBy('createTime', 'desc').get({
      success: res => {
        const notifications = res.data
        const unreadCount = notifications.filter(n => !n.read).length
        this.setData({
          notifications,
          unreadCount
        })
      }
    })
  },

  markAsRead(e) {
    const id = e.currentTarget.dataset.id
    db.collection('notifications').doc(id).update({
      data: {
        read: true,
        readTime: db.serverDate()
      },
      success: () => {
        this.loadNotifications()
      }
    })
  },

  markAllAsRead() {
    db.collection('notifications').where({
      receiverId: app.globalData.openId,
      read: false
    }).get({
      success: res => {
        const batch = db.collection('notifications')
        const tasks = res.data.map(item => {
          return batch.doc(item._id).update({
            data: {
              read: true,
              readTime: db.serverDate()
            }
          })
        })
        
        wx.showToast({
          title: '已全部标为已读',
          icon: 'success'
        })
        
        this.loadNotifications()
      }
    })
  },

  deleteNotification(e) {
    const id = e.currentTarget.dataset.id
    wx.showModal({
      title: '确认删除',
      content: '确定要删除这条通知吗？',
      success: res => {
        if (res.confirm) {
          db.collection('notifications').doc(id).remove({
            success: () => {
              wx.showToast({
                title: '删除成功'
              })
              this.loadNotifications()
            }
          })
        }
      }
    })
  },

  formatDate(date) {
    if (!date) return ''
    const d = new Date(date)
    const now = new Date()
    const diff = now - d
    const hour = 3600 * 1000
    const day = 24 * hour

    if (diff < hour) {
      return Math.floor(diff / 60000) + '分钟前'
    } else if (diff < day) {
      return Math.floor(diff / hour) + '小时前'
    } else if (diff < 7 * day) {
      return Math.floor(diff / day) + '天前'
    } else {
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    }
  }
})