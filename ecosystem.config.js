module.exports = {
  apps: [
    {
      name: "investcool-backend",
      script: "./backend/venv/bin/gunicorn",
      args: "-w 2 -b 127.0.0.1:5000 --chdir ./backend/app main:app",
      interpreter: "python3",
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
