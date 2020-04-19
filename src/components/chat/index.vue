<template>
	<div id="app">
		<dialog-window ref="loginDialog" title="你的昵称" confirmBtn="进入" @confirm="login">
			<input v-model="nickname" type="text" />
		</dialog-window>

		<dialog-window
			ref="createGroupDialog"
			title="输入群名称"
			cancelBtn="取消"
			confirmBtn="确认"
			@confirm="createGroup"
		>
			<input v-model="groupName" type="text" />
		</dialog-window>

		<div class="container">
			<div class="left">
				<div class="aside content">
					<div class="header">
						<div class="tab-bar">
							<label :class="{active:switchType==1,unread: usersUnRead}" for @click="switchType=1">
								<div :class="[{userActive:switchType==1},'user']"></div>
							</label>
							<label :class="{active:switchType==2, unread: groupsUnRead}" for @click="switchType=2">
								<div :class="[{groupActive:switchType==2},'group']"></div>
							</label>
						</div>
					</div>
					<div class="body user-list">
						<div v-if="switchType == 1">
							<div
								:class="[{onChat:item.nickname == title},{offline: !item.status},'user']"
								@click="triggerPersonal(item)"
								v-for="item in currentUserList"
								:key="item.uid"
							>
								<div class="profile">
									<img src="@/assets/profile.png" alt />
								</div>
								<p>{{item.nickname}}</p>
								<span class="tips-num" v-if="item.unread">{{item.unread}}</span>
							</div>
						</div>
						<div v-if="switchType==2">
							<div
								:class="[{onChat:item.name == title},'user']"
								@click="triggerGroup(item)"
								v-for="item in currentGroups"
								:key="item.uid"
							>
								<div class="group">
									<img src="@/assets/group.png" alt />
								</div>
								<p>{{item.name}}</p>
								<span class="tips-num" v-if="item.unread">{{item.unread}}</span>
								<span v-if="!checkUserIsGroup(item)" @click.stop="addGroup(item)" class="add-group">加入</span>
							</div>
							<div class="func">
								<div class="new-group" @click="$refs.createGroupDialog.show()">
									<img src="@/assets/add.png" alt />
								</div>
							</div>
						</div>
					</div>
				</div>
			</div>
			<div class="right content">
				<div class="header title">{{title}}</div>
				<div class="body chat" id="chat">
					<div class="ul">
						<div
							class="li"
							:class="{user: item.uid == uid}"
							v-for="(item,index) in currentMessage"
							:key="index"
						>
							<template v-if="item.type===1">
								<p class="join-tips">{{item.msg}}</p>
							</template>
							<template v-else>
								<div class="message">
									<span v-if="item.uid != uid" class="nickname">{{item.nickname}}</span>
									<span class="date">{{item.date}}</span>
									<span v-if="item.uid == uid" class="nickname">{{item.nickname}}</span>
								</div>
								<pre class="message-box">{{item.msg}}</pre>
							</template>
						</div>
					</div>
				</div>
				<div class="footer" v-show="title">
					<textarea
						autocomplete="off"
						autofocus
						required
						type="text"
						v-model="msg"
						placeholder="Ctrl + Enter 键发送"
					/>

					<button @click="send">发送</button>
				</div>
			</div>
		</div>
	</div>
</template>

<script>
import moment from 'moment'
import DialogWindow from '@/components/dialog/index'
export default {
	name: 'Page',
	components: {
		DialogWindow,
	},
	data() {
		return {
			title: '',
			switchType: 1,
			uid: '',
			nickname: '',
			socket: '',
			msg: '',
			messageList: [],
			users: [],
			groups: [],
			groupId: '',
			bridge: [],
			groupName: ''
		}
	},
	mounted() {
		let vm = this;
		let user = localStorage.getItem('RAINY_USER');
		user = user && JSON.parse(user) || {};
		vm.uid = user.uid;
		vm.nickname = user.nickname;
		if (!vm.uid) {
			vm.$refs.loginDialog.show()
		} else {
			vm.conWebSocket();
		}
		document.onkeydown = function (event) {
			var e = event || window.event;
			if (e && e.ctrlKey && e.keyCode == 13) {
				vm.send()
			}
			else if (
				e & e.keyCode == 13
			) {
				e.preventDefault();//兼容IE8
				e.returnValue = false;
				//TODO 手动增加换行符

			}
		}
		window.onbeforeunload = function () {
			vm.socket.send(JSON.stringify({
				uid: vm.uid,
				type: 2,
				nickname: vm.nickname,
				bridge: []
			}));
		}
	},
	computed: {
		currentMessage() {
			let vm = this;
			let data = vm.messageList.filter(item => {
				if (item.type === 1) {
					return item;
				} else if (this.groupId) {
					return item.groupId === this.groupId
				} else if (item.bridge.length) {
					return item.bridge.sort().join(',') == vm.bridge.sort().join(',')
				}
			})
			data.map(item => {
				item.status = 0
				return item;
			})
			return data;
		},
		currentGroups() {
			let vm = this;
			vm.groups.map(group => {
				group.unread = this.messageList.filter(item => {
					return item.groupId === group.id && item.status === 1
				}).length
				return group;
			})
			return vm.groups;
		},
		groupsUnRead() {
			return this.messageList.some(item => {
				return item.groupId && item.status === 1
			})
		},
		usersUnRead() {
			return this.messageList.some(item => {
				return item.bridge.length && item.status === 1
			})
		},
		currentUserList() {
			let vm = this;
			vm.users.map(user => {
				user.unread = this.messageList.filter(item => {
					return item.bridge.length && item.uid === user.uid && item.status === 1
				}).length
				return user;
			})
			return vm.users.filter(user => {
				return user.nickname != this.nickname;
			});
		}
	},
	methods: {
		addGroup(item) {
			this.socket.send(JSON.stringify({
				uid: this.uid,
				type: 20,
				nickname: this.nickname,
				groupId: item.id,
				groupName: item.name,
				bridge: []
			}));
			this.$message({ message: `成功加入${item.name}` })
		},
		checkUserIsGroup(item) {
			return item.users.some(item => {
				return item.uid === this.uid
			})
		},
		createGroup() {
			this.groupName = this.groupName.trim();
			if (!this.groupName) {
				this.$message({ message: '请输入群名称' })
				return;
			}
			this.currentGroups.forEach(item => {
				if (item.name == this.groupName) {
					this.$message({ message: '该名称的群组已存在' })
					return;
				}
			})
			this.socket.send(JSON.stringify({
				uid: this.uid,
				type: 10,
				nickname: this.nickname,
				groupName: this.groupName,
				bridge: []
			}));
		},
		triggerGroup(item) {
			let issome = item.users.some(item => {
				return item.uid === this.uid
			})
			if (!issome) {
				this.$message({ message: `您还不是该群成员` })
				return
			}
			this.bridge = [];
			this.groupId = item.id;
			this.title = `${item.name}`;
		},
		triggerPersonal(item) {
			if (this.uid === item.uid) {
				return;
			}
			this.groupId = '';
			this.bridge = [this.uid, item.uid];
			this.title = `${item.nickname}`;
		},
		send() {
			this.msg = this.msg.trim();
			if (!this.msg) {
				return
			}
			if (!this.bridge.length && !this.groupId) {
				this.$message({ message: '请选择发送人或者群' })
				return;
			}
			this.sendMessage(100, this.msg)
		},
		sendMessage(type, msg) {
			this.socket.send(JSON.stringify({
				uid: this.uid,
				type: type,
				nickname: this.nickname,
				msg: msg,
				bridge: this.bridge,
				groupId: this.groupId
			}));
			this.msg = '';
		},
		conWebSocket() {
			let vm = this;
			if (window.WebSocket) {
				vm.socket = new WebSocket('ws://localhost:4001');
				let socket = vm.socket;
				socket.onopen = function () {
					vm.$message({ message: '连接服务器成功' })
					if (!vm.uid) {
						vm.uid = 'rain_user_' + moment().valueOf();
						localStorage.setItem('RAINY_USER', JSON.stringify({
							uid: vm.uid,
							nickname: vm.nickname
						}))
					}
					// 请求数据，以加载已有的用户和群组
					vm.sendMessage(1);
				}
				socket.onclose = function () {
					console.log("服务器关闭");
				}
				socket.onerror = function () {
					console.log("连接出错");
				}
				// 接收服务器的消息
				socket.onmessage = function (e) {
					let message = JSON.parse(e.data);
					vm.messageList.push(message);
					if (message.users) {
						vm.users = message.users;
					}
					if (message.groups) {
						vm.groups = message.groups;
					}

					vm.$nextTick(function () {
						var div = document.getElementById('chat');
						div.scrollTop = div.scrollHeight;
					})
				}
			}
		},
		login() {
			this.nickname = this.nickname.trim();
			if (!this.nickname) {
				this.$message({ message: '你的昵称' })
				return;
			}
			this.$refs.loginDialog.hide()
			this.conWebSocket();
		}
	}
}
</script>

<style lang='less'>
* {
	padding: 0;
	margin: 0;
	box-sizing: border-box;
	outline: none;
}

html,
body,
#app {
	width: 100%;
	height: 100%;
	font-family: Tahoma, Arial, sans-serif, Helvetica;
}

.container {
	display: flex;
	width: 100%;
	height: 100%;
	.content {
		display: flex;
		flex: 1;
		min-width: 0;
		flex-direction: column;

		.header {
			// padding-bottom: 5px;
			height: 50px;
			z-index: 10;
			background: #fff;
		}

		// 滚动条样式
		::-webkit-scrollbar {
			width: 10px;
			height: 10px;
		}
		// 背景
		::-webkit-scrollbar-track {
			background: rgba(233, 233, 233, 0.5);
			border-radius: 2px;
		}
		// 滑块
		::-webkit-scrollbar-thumb {
			background: #bfbfbf;
			border-radius: 10px;
		}
		::-webkit-scrollbar-thumb:hover {
			background: #333;
		}
		::-webkit-scrollbar-corner {
			background: rgba(233, 233, 233, 0.5);
			border-radius: 10px;
		}

		.footer {
			border-left: 1px solid #eee;
			width: 100%;
			height: 130px;
			min-width: 300px;
		}
	}

	.left {
		width: 25vw;

		.aside {
			height: 100%;
		}

		.tab-bar {
			display: flex;
			label {
				flex: 1;
				display: flex;
				justify-content: center;
				align-items: center;
				line-height: 40px;
				cursor: pointer;
				font-size: 1.2rem;
				border-bottom: 1px solid #eee;
				padding: 8px 0;
				&.active {
					border-bottom: none;
				}

				&:last-child {
					border-left: 1px solid #eee;
				}

				&.unread {
					//TODO 未读时标签栏的样式
				}
				.user {
					width: 35px;
					height: 35px;
					border-bottom: none;
					background: url(../../assets/profile.png) no-repeat;
					background-size: contain;
					&.userActive {
						background: url(../../assets/profile_active.png)
							no-repeat;
						background-size: contain;
					}
				}
				.group {
					width: 26px;
					height: 26px;
					background: url(../../assets/group.png) no-repeat;
					background-size: contain;

					&.groupActive {
						background: url(../../assets/group_active.png) no-repeat;
						background-size: contain;
					}
				}
			}
		}

		.user-list {
			position: relative;
			font-size: 1.2rem;
			height: 100%;
			.func {
				position: absolute;
				bottom: 20px;
				right: 20px;
				.new-group {
					cursor: pointer;
					height: 45px;
					width: 45px;
					border-radius: 50%;
					background-color: #66a6ff;

					position: relative;
					img {
						position: absolute;
						top: 50%;
						left: 50%;
						transform: translate(-50%, -50%);
					}
					&:active {
						background: #48c7ef;
					}
				}
			}
		}

		.user {
			display: flex;
			align-items: center;
			height: 50px;
			padding: 0 10px;
			border-bottom: 1px solid #eee;
			position: relative;
			.profile {
				height: 35px;
				width: 35px;
				img {
					width: 100%;
					height: 100%;
				}
			}
			.group {
				margin-left: 5px;
				height: 35px;
				width: 35px;
				img {
					margin-top: 4px;
					width: 26px;
					height: 26px;
				}
			}
			p {
				margin-left: 4px;
				font-size: 1.1rem;
			}
			&.offline {
				color: #ccc;
			}

			&.online {
				color: #333;
			}

			.tips-num {
				margin-left: 10px;
				height: 16px;
				color: #ffffff;
				background: #66a6ff;
				min-width: 17px;
				border-radius: 50px;
				display: inline-block;
				line-height: 16px;
				text-align: center;
				font-size: 0.6rem;
			}

			.add-group {
				background-color: #66a6ff;
				color: white;
				position: absolute;
				right: 15px;
				font-size: 0.8rem;
				width: 34px;
				height: 25px;
				line-height: 25px;
				text-align: center;
				border-radius: 3px;
				cursor: pointer;
			}
		}
		.onChat {
			background-color: rgba(233, 233, 233, 0.5);
		}
	}

	.right {
		.title {
			font-size: 1.5rem;
			padding: 0 20px;
			line-height: 50px;
		}

		.body {
			flex: 1;
			padding: 10px 20px;
			overflow-y: auto;
			min-width: 300px;
		}

		.chat {
			background-color: rgba(233, 233, 233, 0.5);

			.join-tips {
				display: block;
				color: #cccccc;
				font-size: 1rem;
				text-align: center;
				width: 100%;
				height: 13px;
			}

			.li {
				margin-bottom: 15px;
				position: relative;
				color: #46b0ff;

				&:after {
					content: '';
					display: block;
					clear: both;
				}

				.message {
					font-size: 1rem;
					color: #b9b8b8;
					.date {
						margin: 0 5px;
					}
					.nickname {
						color: #46b0ff;
					}
				}

				&.user {
					text-align: right;
					color: black;

					.message {
						.nickname {
							color: black;
						}
					}
				}
			}

			.message-box {
				margin-top: 3px;
				display: inline-block;
				text-align: left;
				padding: 2px 2vw;
				background-color: white;
				box-shadow: 2px 2px 2px 2px #eee;
				line-height: 25px;
				font-size: 1.1rem;

				word-wrap: break-word;
				word-break: break-all;
			}
		}

		.footer {
			position: relative;
			textarea {
				width: 92%;
				height: 50%;
				border: none;
				margin: 10px 15px;
				resize: none;
				font-size: 0.9rem;
			}

			button {
				border-radius: 5px;
				position: absolute;
				border: none;
				bottom: 10px;
				right: 10px;
				height: 35px;
				width: 65px;
				background: #66a6ff;
				color: #fff;
				font-size: 1rem;
				&:active {
					background: #48c7ef;
				}
			}
		}
	}
}

// 提示框
div.tip-message {
	text-align: center;
	position: absolute;
	height: 100%;
	width: 100%;
	top: 0;
	left: 0;
	z-index: 4000;

	.tip-message-cover {
		position: fixed;
		height: 100%;
		width: 100%;
		background: #000;
		opacity: 0.2;
		top: 0;
		left: 0;
		z-index: 4001;
	}

	.tip-message-group {
		opacity: 0.8;
		background-color: white;
		background-size: 20px 20px;
		top: 50%;
		border-radius: 6px;
		padding: 0 40px 0 52px;
		z-index: 4002;
		height: 60px;
		overflow: hidden;
		line-height: 60px;
		position: fixed;
		min-width: 300px;
		left: 50%;
		transform: translateX(-50%);
		box-shadow: 0 2px 8px rgba(0, 0, 0, 0.12), 0 0 6px rgba(0, 0, 0, 0.04);
		animation: show 0.2s;

		p {
			margin: 0;
			color: #333333;
			font-size: 1rem;

			padding-right: 10px;
		}

		.tip-message-close {
			width: 15px;
			height: 15px;
			background-size: 15px 15px;
			position: absolute;
			right: 14px;
			top: 20px;
			cursor: pointer;
		}
	}

	@keyframes show {
		from {
			transform: scale(0) translateX(-100%);
		}

		to {
			transform: scale(1) translateX(-50%);
		}
	}
}
</style>