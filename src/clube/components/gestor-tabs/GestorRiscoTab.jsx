import RiscoContent from '../shared/RiscoContent.jsx';

export default function GestorRiscoTab({ clube, navHistory, gestorData, getToken, user }) {
  return (
    <div style={{ padding: 24 }}>
      <RiscoContent
        clube={clube}
        getToken={getToken}
        user={user}
        navHistory={navHistory}
        operacional={gestorData?.operacional}
      />
    </div>
  );
}
