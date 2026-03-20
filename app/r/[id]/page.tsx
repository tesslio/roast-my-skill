import { getRoast } from "@/lib/store";
import { notFound } from "next/navigation";
import SharedRoastView from "./SharedRoastView";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function SharedRoastPage({ params }: Props) {
  const { id } = await params;
  const roast = await getRoast(id);

  if (!roast) {
    notFound();
  }

  return <SharedRoastView roast={roast} />;
}
