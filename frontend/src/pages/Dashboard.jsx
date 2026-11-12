import React from "react";
import "../styling/dashboard.scss";
import SidePanel from "../components/SidePanel";
import Panel from "../components/Panel";
import RoomStatusChart from "../components/RoomStatusChart";
import ExpiringContractsTable from "../components/ExpiringContractsTable";

function Dashboard() {
  return (
    <div className="home-container">
      <SidePanel selected="dashboard"></SidePanel>
      <div className="home-content">
        <Panel title="Room status">
          <RoomStatusChart />
        </Panel>
        <Panel title="Unpaid rooms"></Panel>
        <Panel title="Contract deadline">
          <ExpiringContractsTable />
        </Panel>

        <Panel title="Incomplete task"></Panel>
      </div>
    </div>
  );
}

export default Dashboard;
