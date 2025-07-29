
import { Card, CardContent, CardHeader, CardTitle } from "@ui/shared";
import { Button } from "@ui/shared";
import { Bed, DollarSign, Users, TrendingUp, Calendar, AlertCircle } from "lucide-react";

interface StatsCardProps {
  title: string;
  value: string;
  icon: React.ReactNode;
  change?: string;
  changeType?: 'increase' | 'decrease';
}

const StatsCard: React.FC<StatsCardProps> = ({ title, value, icon, change, changeType }) => (
  <Card>
    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
      <CardTitle className="text-sm font-medium">{title}</CardTitle>
      {icon}
    </CardHeader>
    <CardContent>
      <div className="text-2xl font-bold">{value}</div>
      {change && (
        <p className={`text-xs ${changeType === 'increase' ? 'text-green-600' : 'text-red-600'}`}>
          {change}
        </p>
      )}
    </CardContent>
  </Card>
);

export const AdminDashboard = () => {
  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <Button>
          <Calendar className="mr-2 h-4 w-4" />
          Generate Report
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          title="Total Revenue"
          value="€12,450"
          icon={<DollarSign className="h-4 w-4 text-muted-foreground" />}
          change="+20.1% from last month"
          changeType="increase"
        />
        <StatsCard
          title="Active Bookings"
          value="+235"
          icon={<Bed className="h-4 w-4 text-muted-foreground" />}
          change="+180.1% from last month"
          changeType="increase"
        />
        <StatsCard
          title="Total Guests"
          value="+1,234"
          icon={<Users className="h-4 w-4 text-muted-foreground" />}
          change="+19% from last month"
          changeType="increase"
        />
        <StatsCard
          title="Occupancy Rate"
          value="87%"
          icon={<TrendingUp className="h-4 w-4 text-muted-foreground" />}
          change="+5% from last month"
          changeType="increase"
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Recent Bookings</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center">
                <div className="ml-4 space-y-1">
                  <p className="text-sm font-medium leading-none">John Doe</p>
                  <p className="text-sm text-muted-foreground">Room 101 - 3 nights</p>
                </div>
                <div className="ml-auto font-medium">€240</div>
              </div>
              <div className="flex items-center">
                <div className="ml-4 space-y-1">
                  <p className="text-sm font-medium leading-none">Jane Smith</p>
                  <p className="text-sm text-muted-foreground">Room 205 - 2 nights</p>
                </div>
                <div className="ml-auto font-medium">€180</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Alerts</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center space-x-2 text-amber-600">
                <AlertCircle className="h-4 w-4" />
                <span className="text-sm">Room 301 needs cleaning</span>
              </div>
              <div className="flex items-center space-x-2 text-red-600">
                <AlertCircle className="h-4 w-4" />
                <span className="text-sm">Maintenance required - Room 105</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};