import { Component } from 'react';

/**
 * 全域錯誤邊界：任一 render 例外時顯示可重載的畫面，
 * 避免整個 app 無聲白屏（SW 快取舊 chunk、資料異常等情境）。
 */
export default class AppErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error('AppErrorBoundary caught:', error, info?.componentStack);
  }

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-neutral-900 px-6 text-center text-gray-200">
        <h1 className="text-xl font-bold text-brand-gold">頁面發生錯誤</h1>
        <p className="max-w-md text-sm text-gray-400">
          很抱歉，畫面渲染時發生問題。重新載入通常可以解決；若持續發生，請回報給我們。
        </p>
        <button
          type="button"
          onClick={this.handleReload}
          className="rounded-md border border-brand-gold px-4 py-2 text-sm font-bold text-brand-gold transition hover:bg-brand-gold hover:text-neutral-900"
        >
          重新載入
        </button>
      </div>
    );
  }
}
