import * as materialAction from "./material/material-action";
import * as materialAlert from "./material/material-alert";
import * as materialAv from "./material/material-av";
import * as materialCommunication from "./material/material-communication";
import * as materialContent from "./material/material-content";
import * as materialDevice from "./material/material-device";
import * as materialEditor from "./material/material-editor";
import * as materialFile from "./material/material-file";
import * as materialHardware from "./material/material-hardware";
import * as materialHome from "./material/material-home";
import * as materialImage from "./material/material-image";
import * as materialMaps from "./material/material-maps";
import * as materialMath from "./material/material-math";
import * as materialNavigation from "./material/material-navigation";
import * as materialNotification from "./material/material-notification";
import * as materialPlaces from "./material/material-places";
import * as materialSearch from "./material/material-search";
import * as materialShopping from "./material/material-shopping";
import * as materialSocial from "./material/material-social";
import * as materialToggle from "./material/material-toggle";

const icons = {
  "Material Action": materialAction,
  "Material Alert": materialAlert,
  "Material Av": materialAv,
  "Material Communication": materialCommunication,
  "Material Content": materialContent,
  "Material Device": materialDevice,
  "Material Editor": materialEditor,
  "Material File": materialFile,
  "Material Hardware": materialHardware,
  "Material Home": materialHome,
  "Material Image": materialImage,
  "Material Maps": materialMaps,
  "Material Math": materialMath,
  "Material Navigation": materialNavigation,
  "Material Notification": materialNotification,
  "Material Places": materialPlaces,
  "Material Search": materialSearch,
  "Material Shopping": materialShopping,
  "Material Social": materialSocial,
  "Material Toggle": materialToggle,
} as { [key: string]: { [key: string]: () => SVGSVGElement } };

for (const category in icons) {
  document.body.appendChild(document.createElement("h1")).textContent =
    category;
  const button = document.body.appendChild(document.createElement("button"));
  button.textContent = "Generate";
  const icons_div = document.body.appendChild(document.createElement("div"));
  button.addEventListener("click", () => {
    for (const icon in icons[category]) {
      icons_div.appendChild(icons[category][icon]());
    }
  });
}
