const app = getApp()
const db = wx.cloud.database()

Page({
  data: {
    userData: null,
    conversations: [],
    showChat: false,
    currentChatId: '',
    currentChatName: '',
    currentChatType: '',
    messages: [],
    inputText: '',
    images: []
  },

  onLoad() {
    this.getUserData()
    this.loadConversations()
  },

  onShow() {
    this.loadConversations()
    if (this.data.showChat) {
      this.loadMessages()
    }
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

  loadConversations() {
    const conversations = [
      { id: 'company', name: '公司全员群', avatar: '🏢', lastMessage: '欢迎新同事加入！', time: '刚刚', unread: 2, type: 'group' },
      { id: 'tech', name: '技术部群', avatar: '💻', lastMessage: '项目进度讨论', time: '10分钟前', unread: 0, type: 'group' },
      { id: 'market', name: '市场部群', avatar: '📊', lastMessage: '本周活动策划', time: '1小时前', unread: 1, type: 'group' }
    ]
    this.setData({ conversations })
  },

  enterChat(e) {
    const id = e.currentTarget.dataset.id
    const type = e.currentTarget.dataset.type
    const chat = this.data.conversations.find(c => c.id === id)
    this.setData({
      showChat: true,
      currentChatId: id,
      currentChatName: chat.name,
      currentChatType: type
    })
    this.loadMessages()
  },

  closeChat() {
    this.setData({ showChat: false, messages: [], inputText: '' })
  },

  loadMessages() {
    db.collection('chat').where({
      roomId: this.data.currentChatId
    }).orderBy('createTime', 'asc').get({
      success: res => {
        const messages = res.data.map(msg => ({
          ...msg,
          isSelf: msg.senderId === app.globalData.openId,
          time: this.formatTime(msg.createTime)
        }))
        this.setData({ messages })
      },
      fail: () => {
        this.setData({ messages: [] })
      }
    })
  },

  onInput(e) {
    this.setData({ inputText: e.detail.value })
  },

  chooseImage() {
    wx.chooseImage({
      count: 1,
      sourceType: ['album', 'camera'],
      success: (res) => {
        this.setData({ images: res.tempFilePaths })
        this.uploadAndSend(res.tempFilePaths[0])
      },
      fail: () => {
        wx.showToast({ title: '选择图片失败', icon: 'none' })
      }
    })
  },

  uploadAndSend(filePath) {
    wx.showLoading({ title: '发送中...' })
    wx.cloud.uploadFile({
      cloudPath: `chat_images/${Date.now()}.png`,
      filePath,
      success: (res) => {
        this.sendMessage(res.fileID)
        wx.hideLoading()
      },
      fail: () => {
        wx.hideLoading()
        wx.showToast({ title: '图片上传失败', icon: 'none' })
      }
    })
  },

  sendMessage(imageUrl) {
    const content = imageUrl ? '' : this.data.inputText
    if (!content && !imageUrl) {
      wx.showToast({ title: '请输入消息', icon: 'none' })
      return
    }

    const message = {
      roomId: this.data.currentChatId,
      senderId: app.globalData.openId,
      senderName: this.data.userData.name,
      content,
      image: imageUrl,
      createTime: db.serverDate()
    }

    db.collection('chat').add({
      data: message,
      success: () => {
        this.setData({
          inputText: '',
          messages: [...this.data.messages, {
            ...message,
            isSelf: true,
            time: '刚刚'
          }]
        })
      },
      fail: () => {
        wx.showToast({ title: '发送失败', icon: 'none' })
      }
    })
  },

  previewImage(e) {
    wx.previewImage({ urls: [e.currentTarget.dataset.url] })
  },

  formatTime(date) {
    const d = new Date(date)
    const now = new Date()
    const diff = now.getTime() - d.getTime()
    if (diff < 60000) return '刚刚'
    if (diff < 3600000) return `${Math.floor(diff / 60000)}分钟前`
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}小时前`
    return `${d.getMonth() + 1}/${d.getDate()}`
  }
})