import React from 'react';
import './app-load-boundary.css';
import './ui-kit.css';

/** A tab opened before a release can still request a retired lazy chunk. */
export class AppLoadBoundary extends React.Component<React.PropsWithChildren, {failed:boolean}> {
  state = {failed:false};

  static getDerivedStateFromError() { return {failed:true}; }

  render() {
    if (!this.state.failed) return this.props.children;
    const vi = document.documentElement.lang.startsWith('vi');
    return <main className="app-load-recovery" role="alert">
      <h1>{vi?'Không thể tải màn hình':'This page could not load'}</h1>
      <p>{vi?'Ứng dụng có thể vừa được cập nhật hoặc kết nối bị gián đoạn. Tải lại để tiếp tục.':'The app may have been updated or the connection interrupted. Reload to continue.'}</p>
      <button className="ui-btn ui-btn-primary" type="button" onClick={()=>window.location.reload()}>{vi?'Tải lại trang':'Reload page'}</button>
    </main>;
  }
}
