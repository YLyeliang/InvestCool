<script setup lang="ts">
import { marked } from 'marked';

definePageMeta({ 
  middleware: ['admin-auth'],
  layout: false 
});

const config = useRuntimeConfig();
const toast = useToast();

const isAuthorized = ref(false);
const tokenInput = ref('');
const authError = ref('');

// --- 数据状态 ---
const activeView = ref('dashboard'); // 'dashboard', 'archive', 'trash', 'editor'
const articles = ref<any[]>([]);
const searchQuery = ref('');
const editingId = ref<number | null>(null);
const isListLoading = ref(false);
const isSaving = ref(false);
const isSidebarOpen = ref(true);
const isDragging = ref(false);

const form = ref({
  title: '',
  summary: '',
  content: '',
  cover: '',
  content_type: 'analysis',
  category: '深度分析'
});

const showPreview = ref(true);

// --- 计算属性 ---
const stats = computed(() => [
  { label: '库内总内容', value: articles.value.filter(a => !a.is_deleted).length, unit: '篇', icon: 'i-lucide-database' },
  { label: '投资分析', value: articles.value.filter(a => a.content_type === 'analysis' && !a.is_deleted).length, unit: '篇', icon: 'i-lucide-trending-up' },
  { label: '技术项目', value: articles.value.filter(a => a.content_type === 'tutorial' && !a.is_deleted).length, unit: '个', icon: 'i-lucide-flask-conical' },
  { label: '回收站', value: articles.value.filter(a => a.is_deleted).length, unit: '篇', icon: 'i-lucide-trash-2' }
]);

const displayArticles = computed(() => {
  let list = articles.value;
  // Robust check for boolean or 1/0
  const isDeleted = (a: any) => a.is_deleted === true || a.is_deleted === 1;

  if (activeView.value === 'trash') {
    list = list.filter(a => isDeleted(a));
  } else {
    // Both 'dashboard' and 'archive' show active items
    list = list.filter(a => !isDeleted(a));
  }

  if (!searchQuery.value) return list;
  const q = searchQuery.value.toLowerCase();
  return list.filter(a => 
    (a.title && String(a.title).toLowerCase().includes(q)) || 
    (a.category && String(a.category).toLowerCase().includes(q))
  );
});

const livePreview = computed(() => {
  return form.value.content ? marked(form.value.content) : '<div class="py-20 text-center text-slate-300 italic font-medium">预览内容区域</div>';
});

// --- 方法 ---
const getHeaders = () => ({
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${localStorage.getItem('investcool-admin-token')}`
});

const authorize = async () => {
  if (!tokenInput.value) return;
  authError.value = '';
  try {
    const res = await fetch(`${config.public.apiBase}/auth/verify`, { 
      headers: { 'Authorization': `Bearer ${tokenInput.value}` } 
    });
    if (res.ok) {
      localStorage.setItem('investcool-admin-token', tokenInput.value);
      isAuthorized.value = true;
      fetchData();
      toast.add({ title: '验证通过', color: 'success' });
    } else { 
      authError.value = '令牌错误';
    }
  } catch (e) { authError.value = '连接失败'; }
};

const fetchData = async () => {
  isListLoading.value = true;
  try {
    const res = await fetch(`${config.public.apiBase}/admin/all-content`, { headers: getHeaders() });
    if (res.ok) {
      const data = await res.json();
      articles.value = Array.isArray(data) ? data : [];
    }
  } finally { isListLoading.value = false; }
};

const editItem = (item: any) => {
  editingId.value = item.id;
  form.value = { ...item };
  activeView.value = 'editor';
};

const startNew = () => {
  editingId.value = null;
  form.value = { title: '', summary: '', content: '', cover: '', content_type: 'analysis', category: '深度分析' };
  activeView.value = 'editor';
};

const save = async () => {
  if (!form.value.title) return toast.add({ title: '请输入标题', color: 'warning' });
  isSaving.value = true;
  const method = editingId.value ? 'PUT' : 'POST';
  const url = editingId.value ? `${config.public.apiBase}/analysis/${editingId.value}` : `${config.public.apiBase}/analysis`;
  try {
    const res = await fetch(url, { method, headers: getHeaders(), body: JSON.stringify(form.value) });
    if (res.ok) { 
      toast.add({ title: '同步成功', color: 'success' });
      fetchData();
      activeView.value = 'archive';
    }
  } finally { isSaving.value = false; }
};

const moveToTrash = async (id: number) => {
  if (!confirm('确定移至回收站吗？内容将从前台下线。')) return;
  await fetch(`${config.public.apiBase}/analysis/${id}`, { method: 'DELETE', headers: getHeaders() });
  fetchData();
  toast.add({ title: '已移至回收站', color: 'success' });
};

const restore = async (id: number) => {
  await fetch(`${config.public.apiBase}/admin/restore/${id}`, { method: 'POST', headers: getHeaders() });
  fetchData();
  toast.add({ title: '已成功恢复', color: 'success' });
};

const hardDelete = async (id: number) => {
  if (!confirm('【警告】此操作将从数据库彻底抹除该记录！确定吗？')) return;
  await fetch(`${config.public.apiBase}/admin/hard-delete/${id}`, { method: 'DELETE', headers: getHeaders() });
  fetchData();
  toast.add({ title: '记录已彻底粉碎', color: 'error' });
};

const logout = () => {
  localStorage.removeItem('investcool-admin-token');
  isAuthorized.value = false;
  articles.value = [];
};

// --- 上传逻辑 ---
const uploadFile = async (file: File) => {
  const formData = new FormData();
  formData.append('file', file);
  const res = await fetch(`${config.public.apiBase}/upload`, {
    method: 'POST', 
    headers: { 'Authorization': `Bearer ${localStorage.getItem('investcool-admin-token')}` },
    body: formData
  });
  if (res.ok) { 
    const result = await res.json(); 
    return result.url;
  }
  return null;
};

const handleCoverUpload = async (e: any) => {
  const file = e.target.files?.[0] || e.dataTransfer?.files?.[0];
  if (!file) return;
  isDragging.value = false;
  const url = await uploadFile(file);
  if (url) { form.value.cover = url; toast.add({ title: '封面已就绪', color: 'success' }); }
};

const insertImage = async (e: any) => {
  const file = e.target.files[0];
  if (!file) return;
  const url = await uploadFile(file);
  if (url) {
    const textarea = document.querySelector('.main-editor-area') as HTMLTextAreaElement;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const val = form.value.content;
    form.value.content = val.substring(0, start) + `\n![描述](${url})\n` + val.substring(end);
    toast.add({ title: '图片已插入', color: 'success' });
  }
};

const insertFormat = (prefix: string, suffix: string = '') => {
  const textarea = document.querySelector('.main-editor-area') as HTMLTextAreaElement;
  if (!textarea) return;
  const { selectionStart: start, selectionEnd: end, value } = textarea;
  form.value.content = value.substring(0, start) + prefix + value.substring(start, end) + suffix + value.substring(end);
  nextTick(() => { textarea.focus(); textarea.setSelectionRange(start + prefix.length, end + prefix.length); });
};

onMounted(() => {
  const token = localStorage.getItem('investcool-admin-token');
  if (token) {
    fetch(`${config.public.apiBase}/auth/verify`, { headers: { 'Authorization': `Bearer ${token}` } })
      .then(res => { if(res.ok) { isAuthorized.value = true; fetchData(); } });
  }
});
</script>

<template>
  <div class="h-screen w-full bg-white dark:bg-[#09090b] text-slate-900 dark:text-slate-200 font-sans antialiased overflow-hidden flex selection:bg-primary-500/20">
    
    <!-- AUTH LOCK -->
    <div v-if="!isAuthorized" class="fixed inset-0 z-[1000] flex items-center justify-center bg-white dark:bg-[#09090b]">
      <div class="w-full max-w-sm p-10 space-y-10 animate-in fade-in zoom-in-95 duration-700">
        <div class="flex flex-col items-center space-y-4">
          <div class="size-12 rounded-2xl bg-black dark:bg-white flex items-center justify-center text-white dark:text-black">
            <UIcon name="i-lucide-shield-check" class="size-6" />
          </div>
          <h1 class="text-3xl font-black tracking-tighter italic">Invest Studio</h1>
        </div>
        <div class="space-y-6 text-center">
          <UInput v-model="tokenInput" type="password" placeholder="请输入管理验证码" size="xl" class="text-center font-mono" @keyup.enter="authorize" />
          <UButton block size="xl" color="black" class="font-black rounded-2xl shadow-2xl" @click="authorize">INITIALIZE ACCESS</UButton>
          <p v-if="authError" class="text-xs text-red-500 font-bold uppercase tracking-widest">{{ authError }}</p>
        </div>
      </div>
    </div>

    <!-- MAIN DASHBOARD -->
    <template v-else>
      <!-- SIDEBAR -->
      <aside :class="isSidebarOpen ? 'w-64' : 'w-0 overflow-hidden'" class="shrink-0 border-r border-slate-100 dark:border-slate-900 bg-white dark:bg-[#09090b] transition-all duration-300 flex flex-col z-[100]">
        <div class="h-16 flex items-center px-8 border-b border-slate-100 dark:border-slate-900 shrink-0">
          <span class="font-black text-xl tracking-tighter italic">Studio.</span>
        </div>

        <div class="flex-1 py-10 px-4 space-y-1 overflow-y-auto custom-scrollbar">
          <button v-for="v in [
            {id:'dashboard',l:'仪表盘概览',i:'i-lucide-layout-grid'},
            {id:'archive',l:'文章库管理',i:'i-lucide-box'},
            {id:'trash',l:'回收站管理',i:'i-lucide-trash-2'}
          ]" 
            :key="v.id" @click="activeView = v.id"
            class="w-full flex items-center gap-3 px-4 py-3 text-sm font-bold rounded-xl transition-all"
            :class="activeView === v.id ? 'bg-black text-white dark:bg-white dark:text-black shadow-lg' : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-900'"
          >
            <UIcon :name="v.i" class="size-4" /> {{ v.l }}
          </button>

          <div class="mt-10 mb-4 px-4 text-[10px] font-black text-slate-400 uppercase tracking-widest opacity-50">Content Creation</div>
          <button @click="startNew" class="w-full flex items-center gap-3 px-4 py-3 text-sm font-bold text-primary-600 hover:bg-primary-50 dark:hover:bg-primary-950/20 rounded-xl transition-all">
            <UIcon name="i-lucide-plus-circle" class="size-4" /> 撰写新文章
          </button>
        </div>

        <div class="p-6 border-t border-slate-100 dark:border-slate-900 space-y-4">
          <div class="flex items-center gap-3 px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800">
            <div class="size-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)]"></div>
            <span class="text-[10px] font-black text-slate-400 uppercase tracking-tighter">Database: Linked</span>
          </div>
          <button @click="logout" class="w-full flex items-center gap-2 px-4 text-xs font-bold text-slate-400 hover:text-red-500 transition-colors"><UIcon name="i-lucide-log-out" class="size-3.5" /> Logout</button>
        </div>
      </aside>

      <!-- STAGE -->
      <main class="flex-1 flex flex-col min-w-0 bg-white dark:bg-[#09090b]">
        <!-- HEADER -->
        <header class="h-16 shrink-0 border-b border-slate-100 dark:border-slate-900 flex items-center justify-between px-8 z-50 bg-white/80 dark:bg-[#09090b]/80 backdrop-blur-md">
          <div class="flex items-center gap-4">
            <button @click="isSidebarOpen = !isSidebarOpen" class="p-1.5 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400"><UIcon name="i-lucide-panel-left" class="size-5" /></button>
            <div class="h-4 w-px bg-slate-100 dark:bg-slate-900"></div>
            <h2 class="text-xs font-black tracking-[0.2em] text-slate-400 uppercase italic">{{ activeView }}</h2>
          </div>

          <div class="flex items-center gap-3">
            <template v-if="activeView === 'editor'">
              <UButton variant="ghost" color="neutral" class="font-bold" @click="activeView = 'archive'">Discard</UButton>
              <UButton color="black" class="font-black px-8 rounded-xl shadow-xl shadow-slate-200 dark:shadow-none" @click="save" :loading="isSaving">COMMIT_SYNC</UButton>
            </template>
            <template v-else>
              <div class="hidden md:flex items-center bg-slate-50 dark:bg-slate-900 px-3 py-1.5 rounded-lg border border-slate-100 dark:border-slate-800 text-slate-400 mr-4">
                <UIcon name="i-lucide-command" class="size-3.5 mr-2" />
                <span class="text-[10px] font-black uppercase">CMD K</span>
              </div>
              <UButton color="black" icon="i-lucide-plus" class="font-black rounded-xl px-6" @click="startNew">New Content</UButton>
            </template>
          </div>
        </header>

        <!-- VIEWS -->
        <div class="flex-1 overflow-y-auto custom-scrollbar bg-white dark:bg-[#09090b]">
          
          <!-- DASHBOARD -->
          <div v-if="activeView === 'dashboard'" class="p-8 lg:p-16 max-w-6xl mx-auto space-y-16 animate-in fade-in duration-700">
            <div class="space-y-3"><h2 class="text-6xl font-black tracking-tighter">Command Center.</h2><p class="text-slate-400 font-medium text-lg italic">全库资产索引状态：运行稳定</p></div>
            <div class="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div v-for="s in stats" :key="s.label" class="p-8 border border-slate-100 dark:border-slate-900 rounded-3xl bg-white dark:bg-[#0c0c0e] hover:border-black dark:hover:border-white transition-all group relative overflow-hidden">
                <UIcon :name="s.icon" class="size-5 mb-6 text-slate-300 group-hover:text-black dark:group-hover:text-white" />
                <div class="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{{ s.label }}</div>
                <div class="text-4xl font-black tracking-tighter">{{ s.value }}<span class="text-sm ml-1 opacity-20">{{ s.unit }}</span></div>
              </div>
            </div>
          </div>

          <!-- LIST (Archive & Trash) -->
          <div v-else-if="activeView === 'archive' || activeView === 'trash'" class="p-8 lg:p-16 max-w-6xl mx-auto space-y-10 animate-in fade-in duration-500">
            <div class="flex flex-col md:flex-row md:items-end justify-between gap-8 mb-10">
              <div class="space-y-2">
                <h3 class="text-5xl font-black tracking-tighter">{{ activeView === 'trash' ? '回收站' : '内容库' }}</h3>
                <p class="text-xs font-black text-slate-400 uppercase tracking-widest opacity-50">{{ displayArticles.length }} items retrieved from core</p>
              </div>
              <UInput v-model="searchQuery" icon="i-lucide-search" placeholder="检索内容关键字..." class="w-full md:w-80" size="lg" variant="subtle" />
            </div>

            <div v-if="isListLoading" class="space-y-6"><USkeleton v-for="i in 4" :key="i" class="h-24 w-full rounded-3xl" /></div>
            <div v-else class="space-y-4">
              <div v-for="item in displayArticles" :key="item.id" 
                class="group p-8 border border-slate-100 dark:border-slate-900 bg-white dark:bg-[#0c0c0e] rounded-[2rem] hover:border-black dark:hover:border-white transition-all flex items-center justify-between shadow-sm"
              >
                <div class="min-w-0 flex-1 pr-10">
                  <div class="flex items-center gap-3 mb-3">
                    <UBadge :color="item.content_type === 'analysis' ? 'blue' : 'emerald'" variant="subtle" size="xs" class="font-black italic scale-90">{{ item.content_type === 'analysis' ? '深研' : '实验室' }}</UBadge>
                    <span class="text-[10px] font-black text-slate-400 uppercase tracking-widest">{{ item.category }}</span>
                  </div>
                  <h4 class="text-2xl font-black tracking-tight text-slate-800 dark:text-slate-200 truncate cursor-pointer hover:underline" @click="activeView === 'trash' ? null : editItem(item)">{{ item.title }}</h4>
                  <div class="text-xs font-bold text-slate-400 mt-3 font-mono opacity-50 uppercase tracking-tighter">INDEXED: {{ item.created_at?.split('T')[0] }} // RECORD_ID: #{{ item.id }}</div>
                </div>
                
                <!-- 操作区：常驻显示 -->
                <div class="flex items-center gap-2 shrink-0">
                  <template v-if="item.is_deleted">
                    <UButton variant="soft" color="primary" icon="i-lucide-rotate-ccw" @click="restore(item.id)" class="rounded-xl font-bold">恢复</UButton>
                    <UButton variant="soft" color="red" icon="i-lucide-skull" @click="hardDelete(item.id)" class="rounded-xl font-bold">粉碎</UButton>
                  </template>
                  <template v-else>
                    <UButton variant="soft" color="neutral" icon="i-lucide-pencil" @click="editItem(item)" class="rounded-xl font-bold">编辑</UButton>
                    <UButton variant="soft" color="red" icon="i-lucide-trash-2" @click="moveToTrash(item.id)" class="rounded-xl font-bold" />
                  </template>
                </div>
              </div>
              
              <div v-if="!displayArticles.length" class="py-40 text-center flex flex-col items-center opacity-20">
                <UIcon name="i-lucide-inbox" class="size-16 mb-4" />
                <p class="text-xs font-black uppercase tracking-[0.3em]">No records found</p>
              </div>
            </div>
          </div>

          <!-- EDITOR -->
          <div v-else-if="activeView === 'editor'" class="h-full flex flex-col bg-white dark:bg-[#09090b] animate-in fade-in duration-500 overflow-hidden">
            <div class="flex-1 flex overflow-hidden">
              <div class="flex-1 flex flex-col min-w-0 border-r border-slate-50 dark:border-slate-900/50 overflow-hidden">
                <!-- Meta Inputs -->
                <div class="p-12 lg:p-20 pb-8 space-y-12 shrink-0 overflow-y-auto custom-scrollbar max-h-[500px]">
                  <input v-model="form.title" class="w-full bg-transparent border-none outline-none text-5xl lg:text-7xl font-black placeholder:text-slate-100 dark:placeholder:text-slate-900 tracking-tighter leading-[1.1]" placeholder="Composition Title..." />
                  
                  <div class="flex flex-wrap items-center gap-8 border-t border-slate-50 dark:border-slate-900/50 pt-10">
                    <div class="space-y-3">
                      <div class="text-[10px] font-black text-slate-400 uppercase tracking-widest">Classification</div>
                      <USelect v-model="form.category" :options="['深度分析','开源项目','市场趋势']" size="sm" @change="form.content_type=form.category==='开源项目'?'tutorial':'analysis'" class="font-bold min-w-[140px]" />
                    </div>
                    
                    <div class="space-y-3">
                      <div class="text-[10px] font-black text-slate-400 uppercase tracking-widest">Asset Manager</div>
                      <div class="flex items-center gap-3">
                        <div class="relative group/drag rounded-2xl border-2 border-dashed p-1 transition-all" :class="isDragging ? 'border-primary-500 bg-primary-50/10' : 'border-slate-100 dark:border-slate-800'" @dragover.prevent="isDragging = true" @dragleave.prevent="isDragging = false" @drop.prevent="handleCoverUpload">
                          <UButton variant="soft" color="neutral" size="sm" icon="i-lucide-image" :label="form.cover ? 'REPLACE' : 'UPLOAD'" class="rounded-xl font-black text-[9px] px-4" @click="() => $refs.coverInput.click()" />
                          <input ref="coverInput" type="file" class="hidden" accept="image/*" @change="handleCoverUpload" />
                        </div>
                        <div v-if="form.cover" class="size-10 rounded-xl overflow-hidden ring-2 ring-white dark:ring-slate-800 shadow-xl rotate-3"><img :src="form.cover" class="size-full object-cover" /></div>
                      </div>
                    </div>

                    <!-- Preset Covers -->
                    <div class="space-y-3">
                      <div class="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Presets</div>
                      <div class="flex gap-2">
                        <div v-for="(img, idx) in [
                          'https://images.unsplash.com/photo-1611974714658-058f1510dace?q=80&w=800&auto=format&fit=crop',
                          'https://images.unsplash.com/photo-1639762681485-074b7f938ba0?q=80&w=800&auto=format&fit=crop',
                          'https://images.unsplash.com/photo-1551288049-bebda4e38f71?q=80&w=800&auto=format&fit=crop',
                          'https://images.unsplash.com/photo-1518186285589-2f7649de83e0?q=80&w=800&auto=format&fit=crop',
                          'https://images.unsplash.com/photo-1451187580459-43490279c0fa?q=80&w=800&auto=format&fit=crop'
                        ]" :key="idx" @click="form.cover = img" class="size-8 rounded-lg overflow-hidden cursor-pointer transition-all hover:scale-110 grayscale hover:grayscale-0 opacity-40 hover:opacity-100" :class="form.cover === img ? 'ring-2 ring-primary-500 scale-110 grayscale-0 opacity-100' : ''">
                          <img :src="img" class="size-full object-cover" />
                        </div>
                      </div>
                    </div>
                  </div>
                  <UTextarea v-model="form.summary" variant="none" placeholder="Investigative Summary: Distill the essence into one powerful paragraph..." class="text-2xl text-slate-400 font-medium italic p-0 leading-relaxed border-l-4 border-black dark:border-white pl-10" autoresize />
                </div>

                <div class="h-14 px-10 border-y border-slate-50 dark:border-slate-900/50 flex items-center gap-1 bg-white dark:bg-[#09090b] sticky top-0 z-20 shrink-0">
                  <UButton v-for="i in ['bold','italic','quote','code']" :key="i" size="sm" variant="ghost" color="neutral" :icon="`i-lucide-${i}`" class="opacity-40 hover:opacity-100" @click="insertFormat(i==='bold'?'**':i==='italic'?'_':i==='code'?'`':'> ')" />
                  <div class="w-px h-4 bg-slate-100 dark:bg-slate-900 mx-2"></div>
                  <UButton size="sm" variant="ghost" color="neutral" icon="i-lucide-heading-2" @click="insertFormat('\n## ')" />
                  <div class="w-px h-4 bg-slate-100 dark:bg-slate-900 mx-2"></div>
                  <UButton size="sm" variant="ghost" color="primary" icon="i-lucide-image-plus" label="插入配图" class="font-black text-[10px] uppercase" @click="() => $refs.imageInput.click()" />
                  <input ref="imageInput" type="file" class="hidden" accept="image/*" @change="insertImage" />
                  <div class="flex-1"></div>
                  <UButton variant="soft" :color="showPreview ? 'black' : 'neutral'" size="xs" class="font-black text-[9px] uppercase tracking-[0.2em] rounded-lg px-4" @click="showPreview = !showPreview">{{ showPreview ? 'Close Preview' : 'Dual Pane' }}</UButton>
                </div>

                <div class="flex-1 relative p-12 lg:p-20 pt-10">
                  <textarea v-model="form.content" class="main-editor-area w-full h-full resize-none bg-transparent outline-none focus:ring-0 text-slate-700 dark:text-slate-300 leading-[2] font-mono text-[17px] custom-scrollbar" placeholder="Proceed with your investigation..." />
                </div>
              </div>

              <!-- Preview Pane -->
              <div v-if="showPreview" class="flex-1 hidden xl:flex flex-col bg-slate-50/50 dark:bg-[#0c0c0e] overflow-y-auto p-20 custom-scrollbar border-l border-slate-50 dark:border-slate-900/50 animate-in slide-in-from-right-4 duration-500">
                <div class="max-w-2xl mx-auto prose dark:prose-invert" v-html="livePreview"></div>
              </div>
            </div>

            <!-- Footer -->
            <footer class="h-12 border-t border-slate-100 dark:border-slate-900 px-10 flex items-center justify-between text-[10px] font-black text-slate-400 uppercase tracking-widest shrink-0 bg-white dark:bg-[#09090b]">
              <div class="flex items-center gap-10">
                <span class="font-mono flex items-center gap-2"><UIcon name="i-lucide-binary" /> {{ form.content.length }} BYTES</span>
                <span v-if="editingId" class="font-mono text-primary-500">IC-{{ editingId }}</span>
              </div>
              <div class="flex items-center gap-6"><span class="flex items-center gap-2 text-emerald-500 italic"><UIcon name="i-lucide-cloud-upload" /> Sync Engaged</span></div>
            </footer>
          </div>
        </div>
      </main>
    </template>
  </div>
</template>

<style>
/* Precision Layout 2026 */
textarea:focus, input:focus { outline: none !important; box-shadow: none !important; }
.custom-scrollbar::-webkit-scrollbar { width: 4px; }
.custom-scrollbar::-webkit-scrollbar-thumb { background: #eee; border-radius: 10px; }
.dark .custom-scrollbar::-webkit-scrollbar-thumb { background: #1e293b; }

.prose { line-height: 1.85; font-family: 'Inter', system-ui, sans-serif; font-size: 1.1rem; }
.prose :deep(h1), .prose :deep(h2), .prose :deep(h3) { font-weight: 900; letter-spacing: -0.05em; margin-top: 4rem; margin-bottom: 1.5rem; color: #000; line-height: 1.1; }
.dark .prose :deep(h1), .dark .prose :deep(h2), .dark .prose :deep(h3) { color: #fff; }
.prose :deep(p) { font-size: 1.1rem; margin-bottom: 1.75rem; color: #475569; }
.dark .prose :deep(p) { color: #94a3b8; }
.prose :deep(img) { border-radius: 1.5rem; box-shadow: 0 30px 60px rgba(0,0,0,0.12); margin: 3.5rem auto; display: block; }
</style>
