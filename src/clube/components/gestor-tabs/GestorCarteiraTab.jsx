import CarteiraContent from '../shared/CarteiraContent.jsx';

export default function GestorCarteiraTab({ clube, posicoes, getToken, user }) {
  return (
    <div style={{ padding: 24 }}>
      <CarteiraContent
        clube={clube}
        posicoes={posicoes}
        getToken={getToken}
        user={user}
      />
    </div>
  );
}
