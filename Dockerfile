# Используем официальный Node.js образ
FROM node:20

# Устанавливаем рабочую директорию внутри контейнера
WORKDIR /app

# Копируем package.json и package-lock.json (если есть)
COPY package*.json ./

# Устанавливаем зависимости
RUN npm install

# Копируем остальные файлы проекта
COPY . .

# Открываем порт 8080 (Cloud Run использует этот порт по умолчанию)
EXPOSE 8080

# Запускаем сервер
CMD ["node", "index.js"]
