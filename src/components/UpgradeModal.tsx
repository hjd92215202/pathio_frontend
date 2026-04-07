// src/components/UpgradeModal.tsx
export default function UpgradeModal({ isOpen, onClose }: { isOpen: boolean, onClose: () => void }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center p-6">
      <div className="absolute inset-0 bg-gray-900/60 backdrop-blur-md animate-in fade-in duration-500" onClick={onClose}></div>
      
      <div className="relative w-full max-w-4xl bg-white rounded-[3rem] shadow-2xl overflow-hidden animate-in zoom-in-95 slide-in-from-bottom-8 duration-500">
        <div className="grid grid-cols-1 md:grid-cols-2">
          
          {/* 左侧：营销视觉 */}
          <div className="p-12 bg-gray-900 text-white flex flex-col justify-center relative overflow-hidden">
            <div className="relative z-10">
              <span className="text-pathio-500 font-black text-[10px] uppercase tracking-[0.4em] mb-4 block">Upgrade to Pro</span>
              <h2 className="text-4xl font-black italic mb-6 leading-tight">释放团队的<br/>无限创造力</h2>
              <p className="text-gray-400 text-sm leading-relaxed mb-8">
                打破空间限制，开启全员协作模式。让知识在组织内部自由流转，沉淀为核心研究资产。
              </p>
              <div className="space-y-4">
                {['无限路线图空间', '不限数量的协作席位', '高级分享权限', '专属技术支持'].map(f => (
                  <div key={f} className="flex items-center gap-3 text-xs font-bold">
                    <div className="w-4 h-4 rounded-full bg-pathio-500 flex items-center justify-center">
                      <svg className="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={4} d="M5 13l4 4L19 7" /></svg>
                    </div>
                    {f}
                  </div>
                ))}
              </div>
            </div>
            {/* 背景装饰 */}
            <div className="absolute -bottom-20 -left-20 w-64 h-64 bg-pathio-500/20 rounded-full blur-3xl"></div>
          </div>

          {/* 右侧：定价选择 */}
          <div className="p-12 flex flex-col justify-center bg-gray-50">
             <div className="mb-10 text-center">
                <p className="text-gray-400 text-xs font-bold uppercase tracking-widest mb-2">选择您的方案</p>
                <div className="flex justify-center items-baseline gap-1">
                   <span className="text-sm font-bold text-gray-400">RMB</span>
                   <span className="text-5xl font-black text-gray-900 tracking-tighter">30</span>
                   <span className="text-sm font-bold text-gray-400">/ 席位 / 月</span>
                </div>
             </div>

             <div className="space-y-4 mb-10">
                <div className="p-4 bg-white border-2 border-pathio-500 rounded-2xl flex justify-between items-center shadow-sm">
                   <div>
                      <p className="text-sm font-black text-gray-900">团队标准版</p>
                      <p className="text-[10px] text-gray-400">适合 1-20 人的核心研究团队</p>
                   </div>
                   <div className="w-5 h-5 rounded-full border-4 border-pathio-500"></div>
                </div>
                <div className="p-4 bg-white border border-gray-100 rounded-2xl flex justify-between items-center opacity-50 grayscale cursor-not-allowed">
                   <div>
                      <p className="text-sm font-black text-gray-900">企业定制版</p>
                      <p className="text-[10px] text-gray-400">100人以上，私有化部署</p>
                   </div>
                   <div className="w-5 h-5 rounded-full border border-gray-200"></div>
                </div>
             </div>

             <button className="w-full py-5 bg-gray-900 text-white rounded-2xl font-black hover:bg-pathio-500 shadow-xl transition-all active:scale-95 mb-4">
                立即升级方案
             </button>
             <button onClick={onClose} className="w-full text-xs font-bold text-gray-300 hover:text-gray-500 transition-colors uppercase tracking-widest">
                稍后再说
             </button>
          </div>

        </div>
      </div>
    </div>
  );
}