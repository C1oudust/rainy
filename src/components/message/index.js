var option = {
  message: '', //消息文字
  duration: 2000, //显示时间，毫秒，为0提示框不关闭
  id: '', //消息id，动态时间戳
  callback: null, //回调函数
  timer: 0,
};
var Message = function(options) {
  if (typeof options === 'string') {
    option.message = options;
  } else {
    for (var i in options) {
      option[i] = options[i];
    }
  }
  creatHtml();
};
var creatHtml = function() {
    var node = document.createElement('div');
    if (option.id) {
      document.getElementById(option.id + '-p').innerHTML = option.message;
      setTimeoutClose();
      return;
    }
    option.id = new Date().getTime();
    option.id = 'msg' + option.id;
    node.id = option.id;
    node.innerHTML =
      '<div class="tip-message ' +
      option.type +
      '"><div class="tip-message-cover"></div><div class="tip-message-group"><p id="' +
      option.id +
      '-p">' +
      option.message +
      '</p><div class="tip-message-close" id="' +
      option.id +
      '-close"></div></div></div>';
    document.body.appendChild(node);
    bindClose();
  },
  bindClose = function() {
    document.getElementById(option.id + '-close').onclick = function() {
      close();
    };
    setTimeoutClose();
  },
  close = function() {
    var remove = document.getElementById(option.id);
    document.body.removeChild(remove);
    option.id = '';
    clearTimeout(option.timer);
    if (typeof option.callback === 'function') {
      option.callback(Message);
    }
  },
  setTimeoutClose = function() {
    clearTimeout(option.timer);
    if (option.duration > 0) {
      option.timer = setTimeout(function() {
        close();
      }, option.duration);
    }
  };

export default Message;
