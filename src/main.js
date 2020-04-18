import Vue from 'vue';
import App from './App.vue';
import messageUI from './components/message';
Vue.config.productionTip = false;
Vue.prototype.$message = messageUI;
new Vue({
  render: (h) => h(App),
}).$mount('#app');
