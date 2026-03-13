<template>
  <div class="admin-container">
    <header class="admin-header">
      <h2 class="text-2xl font-bold">InvestCool 内容管理后台</h2>
      <div v-if="isAuthorized" class="auth-status">
        <span class="status-dot"></span> 管理员已登录
        <button @click="logout" class="text-xs ml-4 text-red-500 underline">登出</button>
      </div>
    </header>

    <!-- Auth Form -->
    <div v-if="!isAuthorized" class="auth-card card">
      <h3>请输入管理员令牌</h3>
      <p class="text-sm text-gray-500 mb-4">为了保护您的内容，请输入预设的 ADMIN_TOKEN。</p>
      <input 
        v-model="tokenInput" 
        type="password" 
        placeholder="Token..." 
        class="admin-input"
        @keyup.enter="authorize"
      />
      <button @click="authorize" class="admin-btn primary mt-4">验证身份</button>
      <p v-if="authError" class="error-msg">{{ authError }}</p>
    </div>

    <!-- Admin Panel Content -->
    <div v-else class="admin-grid">
      <!-- Article List -->
      <section class="admin-list card">
        <div class="flex justify-between items-center mb-4">
          <h3 class="m-0">文章列表</h3>
          <button @click="startNew" class="admin-btn sm">新建文章</button>
        </div>
        <div class="list-wrapper">
          <div 
            v-for="item in articles" 
            :key="item.id" 
            class="list-item"
            :class="{ active: editingId === item.id }"
            @click="loadForEdit(item)"
          >
            <div class="item-title">{{ item.title }}</div>
            <div class="item-meta">{{ item.category }} · {{ formatDate(item.created_at) }}</div>
          </div>
        </div>
      </section>

      <!-- Editor Form -->
      <section class="admin-editor card">
        <h3 class="mb-4">{{ editingId ? '编辑文章' : '新建文章' }}</h3>
        <div class="form-group">
          <label>标题</label>
          <input v-model="form.title" class="admin-input" placeholder="文章标题..." />
        </div>
        <div class="form-group">
          <label>摘要</label>
          <textarea v-model="form.summary" class="admin-input" rows="2" placeholder="简短摘要..."></textarea>
        </div>
        <div class="form-group">
          <label>分类</label>
          <select v-model="form.category" class="admin-input">
            <option value="Market Trends">市场趋势</option>
            <option value="AI Infrastructure">AI 基础设施</option>
            <option value="Macro Strategy">宏观策略</option>
            <option value="Semiconductors">半导体</option>
          </select>
        </div>
        <div class="form-group">
          <label>正文 (Markdown)</label>
          <textarea v-model="form.content" class="admin-input content-editor" rows="12" placeholder="使用 Markdown 撰写内容..."></textarea>
        </div>
        
        <div class="form-actions mt-6">
          <button @click="save" class="admin-btn primary">提交发布</button>
          <button v-if="editingId" @click="deleteItem" class="admin-btn danger ml-2">彻底删除</button>
          <button @click="resetForm" class="admin-btn ghost ml-2">取消重置</button>
        </div>
      </section>
    </div>
  </div>
</template>

<script setup>
const config = useRuntimeConfig();
const isAuthorized = ref(false);
const tokenInput = ref('');
const authError = ref('');
const articles = ref([]);
const editingId = ref(null);

const form = ref({
  title: '',
  summary: '',
  content: '',
  category: 'Market Trends'
});

const getHeaders = () => {
  const token = localStorage.getItem('investcool-admin-token');
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  };
};

const authorize = () => {
  if (!tokenInput.value) return;
  localStorage.setItem('investcool-admin-token', tokenInput.value);
  isAuthorized.value = true;
  fetchArticles();
};

const logout = () => {
  localStorage.removeItem('investcool-admin-token');
  isAuthorized.value = false;
  articles.value = [];
};

const fetchArticles = async () => {
  try {
    const response = await fetch(`${config.public.apiBase}/analysis`);
    articles.value = await response.json();
  } catch (e) {
    console.error('Fetch error:', e);
  }
};

const loadForEdit = (item) => {
  editingId.value = item.id;
  form.value = { ...item };
};

const startNew = () => {
  editingId.value = null;
  resetForm();
};

const resetForm = () => {
  form.value = { title: '', summary: '', content: '', category: 'Market Trends' };
};

const save = async () => {
  const method = editingId.value ? 'PUT' : 'POST';
  const url = editingId.value 
    ? `${config.public.apiBase}/analysis/${editingId.value}` 
    : `${config.public.apiBase}/analysis`;

  try {
    const response = await fetch(url, {
      method,
      headers: getHeaders(),
      body: JSON.stringify(form.value)
    });

    if (response.status === 403) {
      alert('令牌无效，请重新验证。');
      logout();
      return;
    }

    if (response.ok) {
      alert('发布成功！');
      fetchArticles();
      if (!editingId.value) resetForm();
    }
  } catch (e) {
    alert('提交失败，请检查网络。');
  }
};

const deleteItem = async () => {
  if (!confirm('确定要删除这篇文章吗？操作不可撤销。')) return;
  
  try {
    const response = await fetch(`${config.public.apiBase}/analysis/${editingId.value}`, {
      method: 'DELETE',
      headers: getHeaders()
    });
    if (response.ok) {
      alert('已删除。');
      editingId.value = null;
      resetForm();
      fetchArticles();
    }
  } catch (e) {
    alert('删除失败。');
  }
};

const formatDate = (dateStr) => {
  return new Date(dateStr).toLocaleDateString('zh-CN');
};

onMounted(() => {
  const savedToken = localStorage.getItem('investcool-admin-token');
  if (savedToken) {
    isAuthorized.value = true;
    fetchArticles();
  }
});
</script>

<style scoped>
.admin-container {
  padding: 2rem;
  max-width: 1200px;
  margin: 0 auto;
}

.admin-header {
  margin-bottom: 2rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.status-dot {
  display: inline-block;
  width: 8px;
  height: 8px;
  background: #10b981;
  border-radius: 50%;
  margin-right: 0.5rem;
}

.auth-card {
  max-width: 400px;
  margin: 4rem auto;
  text-align: center;
  padding: 2.5rem !important;
}

.admin-grid {
  display: grid;
  grid-template-columns: 300px 1fr;
  gap: 2rem;
}

.list-wrapper {
  max-height: 600px;
  overflow-y: auto;
}

.list-item {
  padding: 1rem;
  border-bottom: 1px solid var(--border-color);
  cursor: pointer;
  transition: all 0.2s;
}

.list-item:hover {
  background: var(--hover-bg);
}

.list-item.active {
  border-left: 4px solid var(--accent-color);
  background: var(--hover-bg);
}

.item-title {
  font-weight: 600;
  margin-bottom: 0.25rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.item-meta {
  font-size: 0.75rem;
  color: var(--text-secondary);
}

.form-group {
  margin-bottom: 1.25rem;
}

.form-group label {
  display: block;
  font-size: 0.875rem;
  font-weight: 600;
  margin-bottom: 0.5rem;
}

.admin-input {
  width: 100%;
  padding: 0.75rem;
  border-radius: 0.5rem;
  border: 1px solid var(--border-color);
  background: var(--bg-color);
  color: var(--text-primary);
  font-size: 0.9rem;
}

.content-editor {
  font-family: 'Fira Code', monospace;
  line-height: 1.6;
}

.admin-btn {
  padding: 0.6rem 1.2rem;
  border-radius: 0.5rem;
  font-weight: 600;
  cursor: pointer;
  border: none;
  transition: all 0.2s;
}

.admin-btn.sm {
  padding: 0.4rem 0.8rem;
  font-size: 0.75rem;
}

.admin-btn.primary {
  background: var(--accent-color);
  color: white;
}

.admin-btn.danger {
  background: #ef4444;
  color: white;
}

.admin-btn.ghost {
  background: var(--hover-bg);
  color: var(--text-primary);
}

.error-msg {
  color: #ef4444;
  font-size: 0.875rem;
  margin-top: 1rem;
}

@media (max-width: 768px) {
  .admin-grid {
    grid-template-columns: 1fr;
  }
}
</style>
