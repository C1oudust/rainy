<template>
	<div class="popup" v-if="visable">
		<div class="dialog">
			<div class="title" v-if="title">{{title}}</div>
			<div class="content">
				<slot></slot>
			</div>
			<div class="btn">
				<button v-if="cancelBtn" @click="cancel">{{cancelBtn?cancelBtn:'取消'}}</button>
				<button v-if="confirmBtn" @click="confirm">{{confirmBtn?confirmBtn:'确认'}}</button>
			</div>
		</div>
	</div>
</template>

<script>
export default {
	props: {
		title: {
			type: [String],
			default: ''
		},
		cancelBtn: {
			type: [String],
			default: ''
		},
		confirmBtn: {
			type: [String],
			default: ''
		}
	},
	data() {
		return {
			visable: false
		}
	},
	methods: {
		show() {
			this.visable = true
		},
		hide() {
			this.visable = false
		},
		cancel() {
			this.hide()
		},
		confirm() {
			this.$emit('confirm')
			this.hide()
		}
	}
}
</script>

<style lang='less'>
.popup {
	width: 100%;
	height: 100%;
	background: rgba(0, 0, 0, 0.3);
	position: fixed;
	z-index: 10000;

	.dialog {
		position: relative;
		width: 350px;
		height: auto;
		left: 50%;
		top: 50%;
		background: #ffffff;
		border-radius: 5px;
		transform: translate(-50%, -50%);
		padding: 20px;
		.content {
			input {
				padding: 0 10px;
				width: 100%;
				outline: none;
				line-height: 30px;
				border: 1px solid #ccc;
			}
		}
	}

	.title {
		margin-bottom: 20px;
	}

	.btn {
		text-align: center;
		margin-top: 20px;

		button {
			margin: 0 20px;
			width: 100px;
			text-align: center;
			border: none;
			background: #ccc;
			line-height: 40px;
			cursor: pointer;

			&:last-child {
				background: #66a6ff;
				color: #fff;
			}
		}
	}
}
</style>