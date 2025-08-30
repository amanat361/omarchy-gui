import { FileBrowser } from "./FileBrowser";
import { BindingsEditor } from "./BindingsEditor";
import "./index.css";
import { FileEditor } from "./components/FileEditor";

export function App() {
  return (
    <div className="flex flex-col max-w-screen">
      {/* <FileBrowser /> */}
      <FileEditor />
      <BindingsEditor />
    </div>
  );
}

export default App;
