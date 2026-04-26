import { useParams } from "react-router-dom";

export function CampaignDetail() {
  const { id } = useParams();
  return <h1>Campaign {id}</h1>;
}
