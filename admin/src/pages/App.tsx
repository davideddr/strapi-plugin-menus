import { Page } from '@strapi/strapi/admin';
import { Route, Routes } from 'react-router-dom';

import { PERMISSIONS } from '../constants';
import { EditPage } from './EditPage';
import { ListPage } from './ListPage';

const App = () => (
  <Page.Protect permissions={PERMISSIONS.read}>
    <Routes>
      <Route index element={<ListPage />} />
      <Route path="create" element={<EditPage mode="create" />} />
      <Route path="clone/:documentId" element={<EditPage mode="clone" />} />
      <Route path="edit/:documentId" element={<EditPage mode="edit" />} />
      <Route path="*" element={<Page.Error />} />
    </Routes>
  </Page.Protect>
);

export default App;
