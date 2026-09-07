# VisualizeAlgorithm

运行于电脑浏览器的优化算法可视化学习平台。通过等高线、热力图、可旋转三维曲面、实时数学公式和统计曲线，理解优化过程。

**部署约定：`/opt/VisualizeAlgorithm` · Nginx 外部端口 `16042` · Node.js 内部端口 `127.0.0.1:3042` · GitHub `main`。** 遵循仓库中的 [Development.MD](./Development.MD)，使用 Ubuntu、root、Node.js、Nginx、systemd，无 Docker、数据库或登录系统。

## 功能

- 12 种实际执行的优化算法：Gradient Descent、SGD、Mini-batch SGD、Momentum、Nesterov Momentum、Adagrad、RMSProp、Adam、Newton、BFGS、非线性共轭梯度、循环坐标下降。
- 9 个目标函数：Quadratic、Rosenbrock、Himmelblau、Booth、Beale、Sphere、Ackley、Rastrigin、Saddle。
- 每个函数都支持 Contour / Heatmap / 3D Surface。三维图显示两个自变量的函数曲面 **z=f(x,y)**，不是三个优化变量；因此二维与三维模式使用完全相同的轨迹。高度轴采用线性缩放，刻度标明真实函数值。
- 点击设置起点、输入初始坐标、拖动平移、缩放、三维旋转、悬停查看坐标 / 函数值 / 完整梯度范数。
- 播放、暂停、上一步、下一步、重置、时间轴，以及 0.25× / 0.5× / 1× / 2× 速度。空格播放，左右方向键逐步浏览。
- 正梯度场开关、实际更新方向、平滑轨迹和发光当前位置。为了让箭头可读，梯度场箭头长度经过归一化，不代表梯度的绝对大小。
- 参数修改后从起点重新播放。数值输入在回车或失焦时提交，并检查合法范围；学习率滑杆立即生效。
- 多算法同图对比；初始位置相同，各算法可分别配置参数。选择某个算法后编辑它的参数；公式和记录随当前选中的算法切换。
- KaTeX 实时显示函数、梯度、更新公式、位移、Hessian / 逆矩阵以及算法中间变量；展开“为什么？”查看推导。
- Plotly 实时绘制 Loss（即 Function Value）、Gradient Norm、实际步长系数、Step Length；迭代记录按页显示数值计算历史。
- 浅色 / 深色主题、响应式布局、教学模式，主题偏好仅保存在本机。

## 计算约定（避免教学歧义）

1. **真实导数**：通过二阶前向自动微分计算梯度和 Hessian，不用图像拟合值替代。测试使用独立有限差分检验。
2. **SGD / Mini-batch**：为每个目标函数构造 64 个有限和样本损失：`f_i(x)=f(x)+a_iᵀx`，其中 `a_i=(cos(2πi/64),sin(2πi/64))`，`i=0,…,63`。其均值为原目标函数。这是有限和教学模型，并不声称来自真实训练数据。每步无放回抽样；种子 42 可复现。批量 64 时恰好等于完整梯度。图中的 Loss 和停止阈值使用完整目标函数。
3. **Momentum / Nesterov**：速度采用 `v_next=μv−ηg`；Nesterov 在 `x+μv` 计算梯度。公式中单独显示前瞻点和实际用到的梯度。
4. **Adam**：采用一阶、二阶矩及两次偏差修正；平方、除法和平方根均逐坐标进行。ε 位于平方根外。
5. **Newton**：显示纯阻尼 Newton，`x_next=x−ηH⁻¹g`，默认 η=1；始终使用所展示的 Newton 方向。Hessian 奇异时明确停止，不正定时提示可能走向鞍点或上坡。
6. **BFGS**：维护逆 Hessian 近似，初始 B=I。使用 Armijo 回溯；曲率条件不满足时跳过 B 更新。界面显示的真实 Hessian 只用于教学对照。
7. **Conjugate Gradient**：采用 **Polak–Ribière+ 非线性变体**，配合 Armijo 回溯，并在方向不是下降方向时重启；不宣称满足线性 CG 的有限步求解性质。
8. **Coordinate Descent**：交替执行单坐标梯度步，并非每次精确求解该坐标的最小值。单一偏导为零不代表整条轨迹收敛。
9. **停止含义**：完整梯度范数达到阈值只说明接近驻点，Hessian 用于辅助区分极小点和鞍点。Saddle 向下无界；Ackley 在原点不可微，界面显示梯度 / Hessian 未定义并识别已知最小值。
10. **保护与显示**：达到迭代上限、数值越界、不可逆 Hessian 或回溯失败会停止并说明原因，不会静默裁剪算法步长。图形视野不限制实际算法计算范围，轨迹超出等高线视野时可缩小查看。
11. **时间同步**：优化历史在参数变化时重新计算；requestAnimationFrame 只负责位置插值和逐步揭示历史。移动时公式展示本次更新的起点与终点，抵达下一点后切换到下一次计算。暂停、后退和重播都使用同一份状态历史，保留动量和随机抽样结果。
12. **性能**：D3 等高线 / 梯度场缓存于独立 Canvas，轨迹单独绘制；Three.js 复用几何缓冲区；统计图仅在完整迭代变化时更新；3D 与 Plotly 分包加载。实际帧率取决于设备、浏览器、曲面模式及同时比较的轨迹数，不作未经测量的 60 FPS 保证。

## 本地开发

需要 Node.js 22+、npm。

```bash
npm ci
npm run dev
```

Vite 开发地址为 `http://localhost:5173`，不用于生产。所有前端依赖均打包到本地静态资源，无需访问外部公式 / 图表 CDN。

```bash
npm test
npm run build
npm start
```

生产启动后：`http://127.0.0.1:3042`；健康检查：`GET /api/health`。

## Ubuntu 首次部署（root）

以下命令均在你的 Ubuntu 服务器上执行，不需要 sudo。应确保安全组允许 **TCP 16042**；内部 3042 不对公网开放。

### 1. 安装 Node.js、Git、Nginx

已有 Node.js 22+ 时跳过 Node.js 安装部分。systemd 使用 `/usr/bin/node`，不依赖交互式 shell 的 nvm。

```bash
apt-get update
apt-get install -y ca-certificates curl git nginx
curl -fsSL https://deb.nodesource.com/setup_22.x -o /tmp/visualizealgorithm-nodesource.sh
bash /tmp/visualizealgorithm-nodesource.sh
apt-get install -y nodejs
/usr/bin/node --version
```

### 2. 获取 main 分支并构建

新目录首次部署：

```bash
mkdir -p /opt/VisualizeAlgorithm
git clone --branch main https://github.com/LIKE9426334946/VisualizeAlgorithm.git /opt/VisualizeAlgorithm
cd /opt/VisualizeAlgorithm
npm ci
npm test
npm run build
```

如果该目录已经是本仓库，请使用下方更新流程，不要再次 clone。

### 3. 创建并启用 systemd 服务

```bash
cp /opt/VisualizeAlgorithm/deploy/VisualizeAlgorithm.service /etc/systemd/system/VisualizeAlgorithm.service
systemctl daemon-reload
systemctl enable VisualizeAlgorithm
systemctl start VisualizeAlgorithm
systemctl status VisualizeAlgorithm --no-pager
curl --fail http://127.0.0.1:3042/api/health
```

服务使用 root，工作目录为 `/opt/VisualizeAlgorithm`，启动入口为 `backend/server.js`，监听 `127.0.0.1:3042`，异常退出后自动重启。

### 4. 创建并启用 Nginx 独立配置

```bash
cp /opt/VisualizeAlgorithm/deploy/VisualizeAlgorithm.nginx /etc/nginx/sites-available/VisualizeAlgorithm
ln -sfn /etc/nginx/sites-available/VisualizeAlgorithm /etc/nginx/sites-enabled/VisualizeAlgorithm
nginx -t
```

`nginx -t` 成功后执行：

```bash
systemctl enable nginx
systemctl start nginx
systemctl reload nginx
curl --fail http://127.0.0.1:16042/api/health
```

配置包含独立 server 块、Host / Real-IP / Forwarded 请求头和 WebSocket Upgrade 支持，不使用域名。

如果服务器已启用 UFW：

```bash
ufw allow 16042/tcp
```

不要为了本项目单独开启或重设整台服务器的防火墙；在现有安全组 / 防火墙规则中允许 16042 即可。

### 5. 访问

在电脑浏览器中访问：

```text
http://你的服务器公网IP:16042
```

本次仓库交付不等同于已经登录你的 Ubuntu 服务器完成部署。实际服务器部署需在服务器执行上述命令；独立在线演示运行的是相同的前端代码。

## 后续更新

```bash
cd /opt/VisualizeAlgorithm
git pull --ff-only origin main
npm ci
npm test
npm run build
```

以上全部成功后重启：

```bash
systemctl restart VisualizeAlgorithm
systemctl status VisualizeAlgorithm --no-pager
curl --fail http://127.0.0.1:16042/api/health
```

如本次更新包含服务 / Nginx 配置，重新复制对应配置，执行 `systemctl daemon-reload` 和 `nginx -t`，测试通过后再重新加载服务。前端没有数据库或服务器数据迁移。

## 排查

```bash
journalctl -u VisualizeAlgorithm -n 100 --no-pager
systemctl status VisualizeAlgorithm --no-pager
nginx -t
ss -ltnp | rg '3042|16042'
```

未安装 rg 时可将最后一条改为 `ss -ltnp`。正常状态为 Node 仅监听 `127.0.0.1:3042`，Nginx 监听 `16042`。三维视图需要支持 WebGL 的浏览器；不支持时可继续使用等高线和热力图。

## 目录

```text
src/
  engine/          目标函数、二阶自动微分、十二种算法、历史状态
  hooks/           播放时钟与回放控制
  components/      参数、二维/三维图形、公式解释、统计图
  App.tsx          实验状态与组件联动
  styles.css       主题、布局与响应式样式
backend/server.js  Node.js 静态资源服务及健康检查
deploy/            Nginx 与 systemd 配置
tests/             导数、算法更新与边界情况测试
```

技术栈：React、TypeScript、Tailwind CSS、Framer Motion、D3.js、Plotly.js、Three.js、KaTeX、Express、Vite。

## 参考资料

- [SFU 优化测试函数集](https://www.sfu.ca/~ssurjano/optimization.html)：目标函数定义与已知极小值。
- [PyTorch SGD 文档](https://docs.pytorch.org/docs/stable/generated/torch.optim.SGD.html)：SGD 与动量约定参考；本项目 Nesterov 使用文中明确标注的前瞻点表达。
- [Adam 原论文](https://arxiv.org/abs/1412.6980)：动量、二阶矩和偏差修正。
- [PyTorch RMSprop 文档](https://docs.pytorch.org/docs/stable/generated/torch.optim.RMSprop.html)：平方梯度平均与 ε 位置。
