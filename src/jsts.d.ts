declare module 'jsts/org/locationtech/jts/io/GeoJSONReader.js' {
  export default jsts.io.GeoJSONReader
}
declare module 'jsts/org/locationtech/jts/io/GeoJSONWriter.js' {
  export default jsts.io.GeoJSONWriter
}
declare module 'jsts/org/locationtech/jts/operation/polygonize/Polygonizer.js' {
  export default jsts.operation.polygonize.Polygonizer
}
interface GeometryCollectionList {
  iterator(): { hasNext(): boolean; next(): jsts.geom.Geometry }
}
declare module 'jsts/org/locationtech/jts/geom/PrecisionModel.js' {
  export default jsts.geom.PrecisionModel
}
declare module 'jsts/java/util/ArrayList.js' {
  export default class ArrayList implements GeometryCollectionList {
    add(geometry: jsts.geom.Geometry): void
    iterator(): { hasNext(): boolean; next(): jsts.geom.Geometry }
  }
}
declare module 'jsts/org/locationtech/jts/noding/snapround/GeometryNoder.js' {
  export default class GeometryNoder {
    constructor(model: jsts.geom.PrecisionModel)
    node(geometries: GeometryCollectionList): GeometryCollectionList
  }
}
