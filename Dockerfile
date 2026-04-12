FROM maven:3.9.8-eclipse-temurin-17 AS build
WORKDIR /app

# Copy files first for dependency caching
COPY pom.xml .
COPY .mvn .mvn
COPY mvnw .
COPY mvnw.cmd .
RUN chmod +x mvnw

# Copy source and build jar inside the image
COPY src src
RUN ./mvnw -q clean package -DskipTests

FROM eclipse-temurin:17-jre
WORKDIR /app
COPY --from=build /app/target/parking-location-0.0.1-SNAPSHOT.jar app.jar

EXPOSE 8080
ENTRYPOINT ["java","-jar","/app/app.jar"]

