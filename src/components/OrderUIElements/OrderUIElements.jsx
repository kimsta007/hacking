import cx from "clsx";
import { Checkbox, rem, Text } from "@mantine/core";
import { useListState } from "@mantine/hooks";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import { IconGripVertical } from "@tabler/icons-react";
import classes from "./OrderUIElements.module.css";
import { memo, useEffect, useState } from "react";
import { useAppStore } from "../../store/appStore";

const data = [
  { id: "choroplethMap", title: "Choropleth Map" },
  { id: "surpriseMap", title: "Surprise Map" },
  { id: "funnelPlot", title: "Funnel Plot" },
  { id: "pcp", title: "PCP" },
];

function OrderUIElements() {
  const setUIElements = useAppStore((state) => state.setUIElements);

  const [state, handlers] = useListState(data);
  const [visibility, setVisibility] = useState({
    choroplethMap: true,
    surpriseMap: true,
    funnelPlot: false,
    pcp: false,
  });

  const handleVisibilityChange = (event) => {
    const id = event.currentTarget.value;
    const checked = event.currentTarget.checked;
    setVisibility((v) => ({
      ...v,
      [id]: checked,
    }));
  };

  useEffect(() => {
    setUIElements(state.map((s) => ({ ...s, visible: visibility[s.id] })));
  }, [state, visibility, setUIElements]);

  const items = state.map((item, index) => (
    <Draggable key={item.id} index={index} draggableId={item.id}>
      {(provided, snapshot) => (
        <div
          className={cx(classes.item, {
            [classes.itemDragging]: snapshot.isDragging,
          })}
          ref={provided.innerRef}
          {...provided.draggableProps}
        >
          <div {...provided.dragHandleProps} className={classes.dragHandle}>
            <IconGripVertical
              style={{ width: rem(18), height: rem(18) }}
              stroke={1.5}
            />
          </div>
          <div className={classes.checkbox}>
            <Checkbox
              value={item.id}
              checked={visibility[item.id]}
              onChange={handleVisibilityChange}
            />
          </div>
          <div>
            <Text>{item.title}</Text>
          </div>
        </div>
      )}
    </Draggable>
  ));

  return (
    <DragDropContext
      onDragEnd={({ destination, source }) =>
        handlers.reorder({ from: source.index, to: destination?.index || 0 })
      }
    >
      <Droppable droppableId="dnd-list" direction="vertical">
        {(provided) => (
          <div {...provided.droppableProps} ref={provided.innerRef}>
            {items}
            {provided.placeholder}
          </div>
        )}
      </Droppable>
    </DragDropContext>
  );
}
OrderUIElements.propTypes = {};

export default memo(OrderUIElements);
