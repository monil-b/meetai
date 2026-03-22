import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export default function Home() {
  return (
    <div className="p-10 space-y-4">
      <Card>
        <CardContent className="p-6 space-y-4">
          <Input placeholder="Enter meeting name" />
          <Button>Create Meeting</Button>
        </CardContent>
      </Card>
    </div>
  );
}
