import createVueApp from "@/views/contnet-script/main";

const dom = document.createElement("div");
dom.style.position = "fixed";
dom.style.top = "60px";
dom.style.right = "60px";
dom.style.borderRadius = "6px";
dom.style.background = "#fff";
dom.style.padding = "20px";
dom.style.lineHeight = "26px";
dom.style.boxShadow = "0 0 8px #000";

document.body.appendChild(dom);
const app = createVueApp(dom);

// 移除按钮
const removeButton = document.createElement("button");
removeButton.innerText = "remove";
removeButton.onclick = () => {
  // 如果需要销毁 content-script 创建出来的 vue app 时
  // 一定要调用 app.unmount 方法，避免有任务无法连同销毁，比如计时器、DOM 事件监听器或者与服务器的连接等等。
  app.unmount();
  dom.remove();
};
dom.appendChild(removeButton);
