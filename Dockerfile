FROM harbor.mastergo.com/master-tools/basenpm:v20.15.1

WORKDIR /app
COPY . .

EXPOSE 3001

CMD [ "start" ]
ENTRYPOINT [ "npm" ]

