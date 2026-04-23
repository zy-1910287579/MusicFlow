# 多阶段构建
# 阶段1: 构建应用
FROM node AS builder

WORKDIR /app

# 复制依赖文件
COPY package*.json ./

# 安装依赖
RUN npm ci

# 复制源代码
COPY . .

# 构建应用
RUN npm run build

# 阶段2: 使用 nginx 托管
FROM nginx

# 删除默认配置
RUN rm /etc/nginx/conf.d/default.conf

# 复制 nginx 配置
COPY nginx.conf /etc/nginx/conf.d/

# 从构建阶段复制构建产物
COPY --from=builder /app/dist /usr/share/nginx/html

# 暴露端口
EXPOSE 80

# 启动 nginx
CMD ["nginx", "-g", "daemon off;"]
