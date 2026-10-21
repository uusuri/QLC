FROM eclipse-temurin:21-jre

WORKDIR /app

COPY --chown=10001:10001 api/build/libs/qlc-api.jar app.jar

USER 10001:10001

ENTRYPOINT ["java", "-jar", "app.jar"]
