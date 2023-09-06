import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import './App.css';
import { DndProvider, MultiBackend, NodeModel, RenderParams, Tree, getBackendOptions } from '@minoru/react-dnd-treeview';

import { Octokit } from "octokit";
import { Endpoints } from "@octokit/types";

const octokit = new Octokit();

type TreeData = Endpoints['GET /repos/{owner}/{repo}/git/trees/{tree_sha}']['response']['data'];

const prep = (treeData: TreeData): { tree: NodeModel[], root: string } => {
  const folderToId: { [key: string]: string } = {};
  const rootId = treeData.sha;
  const preppedTreeData: NodeModel[] = [];
  console.log(treeData.tree.length)

  for (const { path, type, sha } of treeData.tree.sort(({ path: pathA }, {path: pathB}) => pathA!.length - pathB!.length)) {
    if (!path) continue;

    if (type === 'tree') {
      folderToId[path] = sha as string;
    }

    const folders = path.split('/');
    const file = folders.pop();
    const parentId = folders.length === 0 ? rootId : folderToId[folders.join('/')];

    if (path === 'src') {
      console.log(sha)
    }

    preppedTreeData.push({
      id: sha!,
      parent: parentId,
      droppable: type === 'tree',
      text: `${file}`,
    })
  }
  return {
    tree: preppedTreeData,
    root: rootId
  };
}

const MyContext = createContext<{ selected?: string, setSelected: (sha: string) => void }>({
  setSelected: () => {},
});

const MyEntry = (node: NodeModel, { isOpen, onToggle }: RenderParams) => {
  const myContext = useContext(MyContext)

  const setSelected = useCallback(() => {
    myContext.setSelected(node.id as string)
  }, [node.id, myContext])

  return (
    <div onClick={node.droppable ? undefined : setSelected} style={{ display: 'flex' }}>
      {node.droppable && (
        <span onClick={onToggle}>{isOpen ? "[-]" : "[+]"}</span>
      )}
      {node.text}{myContext.selected === node.id ? ' ←' : ''}
    </div>
  )
}

function App() {
  const [data, setData] = useState<NodeModel[]>([]);
  const [selected, setSelected] = useState<string | undefined>();
  const [root, setRoot] = useState<string>();

  useEffect(() => {
    octokit.request(
      'GET /repos/{owner}/{repo}/git/trees/{tree_sha}',
      {
        owner: 'mintlify-onboarding',
        repo: 'agaveapi',
        tree_sha: 'main',
        recursive: 'true',
      }
    ).then((results) => {
      const {tree, root} = prep(results.data);
      setData(tree);
      setRoot(root);
    })
  }, []);

  return (
    <MyContext.Provider value={{ selected, setSelected }}>
      <DndProvider backend={MultiBackend} options={getBackendOptions()}>
        <div className="App">
          <header className="App-header" style={{ justifyContent: 'flex-start', alignItems: 'flex-start'}}>
            <Tree
              rootId={root!}
              tree={data}
              onDrop={setData}
              render={MyEntry}
            />
          </header>
        </div>
      </DndProvider>
    </MyContext.Provider>
  );
}

export default App;
