import { Outlet, ScrollRestoration } from 'react-router';
import './cabinet.css';
import { SideNav } from './SideNav';
import { TabBar } from './TabBar';
import { TopBar } from './TopBar';

export function CabinetLayout() {
  return (
    <div className="cab">
      <SideNav />
      <div className="cab__body">
        <TopBar />
        <main className="cab__main" id="main">
          <div className="cab__content">
            <Outlet />
          </div>
        </main>
      </div>
      <TabBar />
      <ScrollRestoration getKey={(location) => location.pathname} />
    </div>
  );
}
