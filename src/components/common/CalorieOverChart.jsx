import { useEffect } from "react";
import { Chart } from "@antv/g2";

const CalorieOverChart = () => {
  useEffect(() => {
    // Prepare data
    const data = [
      { genre: "9일", 초과량: 27 },
      { genre: "10일", 초과량: 115 },
      { genre: "11일", 초과량: 12 },
      { genre: "12일", 초과량: 350 },
      { genre: "13일", 초과량: 1 },
      { genre: "14일", 초과량: 550 },
      { genre: "15일", 초과량: 50 },
    ];

    // Initialize chart instance
    const chart = new Chart({
      container: "calorieOverChart", // Match the div id
      autoFit: true,
      height: 100,
    });

    // Declare visualization
    chart
      .interval() // Create an Interval tag
      .data(data) // Bind data
      .encode("x", "genre") // Encode x channel
      .encode("y", "초과량") // Encode y channel
      .axis("y", false) // y축 숨기기
      .axis("x", { title: null }) // x축 레이블 숨기기
      .style("fill", "#da6662");
    // Render visualization
    chart.render();

    // Cleanup on unmount
    return () => {
      chart.destroy();
    };
  }, []);

  return (
    <div id="calorieOverChart" style={{ width: "100%", height: "100px" }}></div>
  );
};

export default CalorieOverChart; 