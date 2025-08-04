import { projectsAPI, filesAPI, authAPI } from './api.js';
import { getCurrentUser } from './auth.js';

let editor;
let currentProject = null;
let currentFile = null;
let projects = [];
let files = [];

// 初始化编辑器
function initEditor() {
  editor = CodeMirror.fromTextArea(document.getElementById('editor'), {
    lineNumbers: true,
    theme: 'dracula',
    mode: 'javascript',
    autoCloseBrackets: true,
    matchBrackets: true,
    indentUnit: 2,
    tabSize: 2
  });

  // 自动保存
  editor.on('change', debounce(async () => {
    if (currentFile) {
      await filesAPI.update(currentFile.id, {
        content: editor.getValue()
      });
    }
  }, 1000));
}

// 防抖函数
function debounce(func, wait) {
  let timeout;
  return function(...args) {
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(this, args), wait);
  };
}

// 加载项目列表
async function loadProjects() {
  try {
    const result = await projectsAPI.list();
    projects = result.projects;
    renderProjects();
  } catch (error) {
    alert(error.message);
  }
}

// 渲染项目列表
function renderProjects() {
  const projectsList = document.getElementById('projectsList');
  projectsList.innerHTML = '';
  
  projects.forEach(project => {
    const div = document.createElement('div');
    div.className = `project-item ${currentProject?.id === project.id ? 'active' : ''}`;
    div.textContent = project.name;
    div.addEventListener('click', () => selectProject(project.id));
    projectsList.appendChild(div);
  });
}

// 选择项目
async function selectProject(projectId) {
  try {
    const result = await projectsAPI.get(projectId);
    currentProject = result.project;
    renderProjects();
    await loadFiles(projectId);
  } catch (error) {
    alert(error.message);
  }
}

// 加载文件列表
async function loadFiles(projectId) {
  try {
    const result = await filesAPI.list(projectId);
    files = result.files;
    renderFiles();
  } catch (error) {
    alert(error.message);
  }
}

// 渲染文件列表
function renderFiles() {
  const filesList = document.getElementById('filesList');
  filesList.innerHTML = '';
  
  files.forEach(file => {
    const div = document.createElement('div');
    div.className = `file-item ${currentFile?.id === file.id ? 'active' : ''}`;
    div.textContent = file.name;
    div.addEventListener('click', () => selectFile(file.id));
    filesList.appendChild(div);
  });
}

// 选择文件
async function selectFile(fileId) {
  try {
    const result = await filesAPI.get(fileId);
    currentFile = result.file;
    editor.setValue(currentFile.content || '');
    editor.setOption('mode', currentFile.type);
    renderFiles();
  } catch (error) {
    alert(error.message);
  }
}

// 设置事件监听
function setupEventListeners() {
  // 新建项目
  document.getElementById('newProjectBtn').addEventListener('click', () => {
    document.getElementById('newProjectModal').style.display = 'flex';
  });

  // 创建项目
  document.getElementById('createProjectBtn').addEventListener('click', async () => {
    const name = document.getElementById('projectName').value;
    if (!name) return;

    try {
      await projectsAPI.create({ name });
      document.getElementById('newProjectModal').style.display = 'none';
      document.getElementById('projectName').value = '';
      await loadProjects();
    } catch (error) {
      alert(error.message);
    }
  });

  // 新建文件
  document.getElementById('newFileBtn').addEventListener('click', () => {
    if (!currentProject) {
      alert('Please select a project first');
      return;
    }
    document.getElementById('newFileModal').style.display = 'flex';
  });

  // 创建文件
  document.getElementById('createFileBtn').addEventListener('click', async () => {
    const name = document.getElementById('fileName').value;
    const type = document.getElementById('fileType').value;
    
    if (!name) return;

    try {
      await filesAPI.create({
        name,
        type,
        projectId: currentProject.id
      });
      
      document.getElementById('newFileModal').style.display = 'none';
      document.getElementById('fileName').value = '';
      await loadFiles(currentProject.id);
    } catch (error) {
      alert(error.message);
    }
  });

  // 登出
  document.getElementById('logoutBtn').addEventListener('click', authAPI.logout);

  // 添加协作者
  document.getElementById('addCollaboratorBtn').addEventListener('click', () => {
    if (!currentProject) {
      alert('Please select a project first');
      return;
    }
    document.getElementById('addCollaboratorModal').style.display = 'flex';
  });

  // 确认添加协作者
  document.getElementById('confirmAddCollaboratorBtn').addEventListener('click', async () => {
    const username = document.getElementById('collaboratorUsername').value;
    
    if (!username) return;

    try {
      await projectsAPI.addCollaborator(currentProject.id, username);
      document.getElementById('addCollaboratorModal').style.display = 'none';
      document.getElementById('collaboratorUsername').value = '';
      alert('Collaborator added successfully');
    } catch (error) {
      alert(error.message);
    }
  });

  // 关闭模态框
  document.querySelectorAll('.modal').forEach(modal => {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        modal.style.display = 'none';
      }
    });
  });
}

// 初始化
document.addEventListener('DOMContentLoaded', async () => {
  const user = getCurrentUser();
  if (!user) {
    window.location.href = '/index.html';
    return;
  }

  document.getElementById('currentUser').textContent = user.username;
  initEditor();
  setupEventListeners();
  await loadProjects();
});