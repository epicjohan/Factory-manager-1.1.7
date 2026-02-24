with open('/Users/johanhouben/Factory_manager/Factory-manager-1.1.3/Factory-manager-1.1.3/pages/TemplateManagement.tsx', 'r') as f:
    content = f.read()

content = content.replace("activeTab === \\'FIXTURE\\' ? \\'bg-white dark:bg-slate-800 text-indigo-600 shadow-sm\\' : \\'text-slate-500 hover:text-slate-700\\'", "activeTab === 'FIXTURE' ? 'bg-white dark:bg-slate-800 text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'")
content = content.replace("activeTab === \\'TOOLS\\' ? \\'bg-white dark:bg-slate-800 text-indigo-600 shadow-sm\\' : \\'text-slate-500 hover:text-slate-700\\'", "activeTab === 'TOOLS' ? 'bg-white dark:bg-slate-800 text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'")

with open('/Users/johanhouben/Factory_manager/Factory-manager-1.1.3/Factory-manager-1.1.3/pages/TemplateManagement.tsx', 'w') as f:
    f.write(content)
