import { Link } from 'react-router-dom';

export default function Home() {
  return (
    <div className="min-h-screen bg-white">
      {/* 导航栏 */}
      <nav className="flex justify-between items-center px-12 py-6">
        <div className="text-2xl font-black tracking-tighter text-pathio-900">PATHIO</div>
        <div className="space-x-8 text-sm font-medium text-gray-600">
          <a href="#features" className="hover:text-pathio-500">产品功能</a>
          <a href="#pricing" className="hover:text-pathio-500">定价方案</a>
          <Link to="/login" className="px-5 py-2 rounded-full border border-gray-200 hover:bg-gray-50 transition-all">登录</Link>
          <Link to="/register" className="px-5 py-2 rounded-full bg-gray-900 text-white hover:bg-pathio-500 transition-all">免费开始</Link>
        </div>
      </nav>

      {/* Hero Section */}
      <main className="max-w-5xl mx-auto text-center pt-24 pb-12">
        <h1 className="text-7xl font-extrabold text-gray-900 tracking-tight leading-tight">
          将灵感连成轨迹，<br />
          让知识有<span className="text-pathio-500 italic">径</span>可寻。
        </h1>
        <p className="mt-8 text-xl text-gray-500 max-w-2xl mx-auto leading-relaxed">
          知径 (Pathio) 是一款为深度学习者打造的可视化知识库。
          通过无限画布组织研究路径，每一个节点都是深度思考的沉淀。
        </p>
        <div className="mt-12 flex justify-center gap-4">
          <Link to="/register" className="px-10 py-4 bg-gray-900 text-white text-lg font-bold rounded-2xl hover:bg-pathio-500 shadow-xl transition-all hover:-translate-y-1">
            立即创建你的路线图
          </Link>
          <button className="px-10 py-4 bg-white border border-gray-200 text-gray-600 text-lg font-bold rounded-2xl hover:bg-gray-50 transition-all">
            查看演示样例
          </button>
        </div>

        {/* 预览图占位 */}
        <div className="mt-20 border-8 border-gray-100 rounded-3xl overflow-hidden shadow-2xl">
           <img src="https://via.placeholder.com/1200x600/f8fafc/64748b?text=Pathio+Canvas+Preview" className="w-full" alt="Preview" />
        </div>
      </main>
    </div>
  );
}