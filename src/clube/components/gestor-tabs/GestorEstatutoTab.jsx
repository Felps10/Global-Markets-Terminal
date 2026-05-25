import EstatutoContent from '../shared/EstatutoContent.jsx';

export default function GestorEstatutoTab({ clube, getToken }) {
  return <div style={{ padding: 24 }}><EstatutoContent clube={clube} getToken={getToken} /></div>;
}
