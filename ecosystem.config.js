module.exports = {
  apps: [
    {
      name: "backend-real",
      script: "/usr/bin/bash",
      args: "-c \"gunicorn -w 2 -b 0.0.0.0:5000 --timeout 90 --graceful-timeout 30 main:app\"",
      cwd: "./backend/app",
      interpreter: "none",
      env: {
        NODE_ENV: "production",
        ADMIN_TOKEN: process.env.ADMIN_TOKEN
      },
      autorestart: true,
      watch: false,
      max_memory_restart: "500M"
    },
    {
      name: "investcool-worker",
      script: "./backend/worker.py",
      interpreter: "./backend/venv/bin/python",
      env: {
        NODE_ENV: "production"
      },
      autorestart: true,
      watch: false,
      max_memory_restart: "500M"
    },
    {
      name: "investcool-frontend",
      script: "npm",
      args: "start",
      cwd: "./frontend",
      env: {
        PORT: 3000,
        NODE_ENV: "production"
      },
      autorestart: true,
      watch: false,
      max_memory_restart: "1G"
    }
  ]
};
