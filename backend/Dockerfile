# Use SDK image for build
FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src

# Copy project files
COPY ["src/LiterateSniffle.API/LiterateSniffle.API.csproj", "LiterateSniffle.API/"]
COPY ["src/LiterateSniffle.Core/LiterateSniffle.Core.csproj", "LiterateSniffle.Core/"]
COPY ["src/LiterateSniffle.Infrastructure/LiterateSniffle.Infrastructure.csproj", "LiterateSniffle.Infrastructure/"]

# Restore dependencies
RUN dotnet restore "LiterateSniffle.API/LiterateSniffle.API.csproj"

# Copy all source files
COPY src/ .

# Build the application
WORKDIR "/src/LiterateSniffle.API"
RUN dotnet build "LiterateSniffle.API.csproj" -c Release -o /app/build

# Publish the application
FROM build AS publish
RUN dotnet publish "LiterateSniffle.API.csproj" -c Release -o /app/publish /p:UseAppHost=false

# Use runtime image for final stage
FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS final
WORKDIR /app
EXPOSE 3000

# Copy published files
COPY --from=publish /app/publish .

# Create uploads directory
RUN mkdir -p uploads/temp

# Set environment variables
ENV ASPNETCORE_URLS=http://+:3000
ENV ASPNETCORE_ENVIRONMENT=Development

ENTRYPOINT ["dotnet", "LiterateSniffle.API.dll"]
