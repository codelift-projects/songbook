import { Navigate, Route, Routes } from 'react-router-dom';
import Layout from './components/Layout';
import SongList from './pages/SongList';
import SongManage from './pages/SongManage';
import SongEditor from './pages/SongEditor';
import Projector from './pages/Projector';
import SongViewer from './pages/SongViewer';
import Settings from './pages/Settings';

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<SongList />} />
        <Route path="/manage" element={<SongManage />} />
        <Route path="/songs/new" element={<SongEditor />} />
        <Route path="/songs/:id/edit" element={<SongEditor />} />
        <Route path="/settings" element={<Settings />} />
      </Route>
      <Route path="/present/:id" element={<Projector />} />
      <Route path="/view/:id" element={<SongViewer />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
