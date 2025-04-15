import { Container } from "@/components/ui/container";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function CompanyPage() {
  return (
    <div className="p-4">
      <Container>
        <h1 className="text-3xl font-bold mb-6">Company Information</h1>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Company Details</CardTitle>
              <CardDescription>Basic information about Synergy Rentals</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <p><span className="font-semibold">Company Name:</span> Synergy Rentals</p>
                <p><span className="font-semibold">Founded:</span> 2020</p>
                <p><span className="font-semibold">Headquarters:</span> Miami, FL</p>
                <p><span className="font-semibold">Total Properties:</span> 24</p>
                <p><span className="font-semibold">Employees:</span> 15</p>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>Mission Statement</CardTitle>
              <CardDescription>Our guiding principles</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm">
                At Synergy Rentals, we strive to provide exceptional short-term rental experiences 
                by combining smart technology with personalized service. Our mission is to maximize 
                property value for owners while delivering memorable stays for guests.
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>Contact Information</CardTitle>
              <CardDescription>How to reach us</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <p><span className="font-semibold">General Inquiries:</span> info@synergyrentals.com</p>
                <p><span className="font-semibold">Support:</span> support@synergyrentals.com</p>
                <p><span className="font-semibold">Operations:</span> operations@synergyrentals.com</p>
                <p><span className="font-semibold">Phone:</span> (305) 555-1234</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </Container>
    </div>
  );
}