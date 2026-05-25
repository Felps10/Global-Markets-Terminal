import OperacionalContent from '../shared/OperacionalContent.jsx';

export default function GestorFilaOperacoesTab({ clube, getToken, user }) {
  return (
    <div style={{ padding: 24 }}>
      <OperacionalContent clube={clube} getToken={getToken} user={user} />
    </div>
  );
}
