var types = require('./types'),
    dbf = require('dbf'),
    prj = require('./prj'),
    ext = require('./extent'),
    getFields = require('./fields'),
    assert = require('assert'),
    pointWriter = require('./points'),
    multipointWriter = require('./multipoint'),
    polyWriter = require('./poly');

var writers = {
    1: pointWriter,
    3: polyWriter,
    5: polyWriter,
    8: multipointWriter,
    11: pointWriter,
    13: polyWriter,
    15: polyWriter,
    18: multipointWriter
};

module.exports = write;

// Low-level writing interface
function write(rows, geometry_type, geometries, callback) {

    var TYPE = types.geometries[geometry_type],
        writer = writers[TYPE],
        // parts - number of features in geojson FeatureCollection
        parts = writer.parts(geometries, TYPE),
        // shpLength - the total length of the SHP file in 16-bit words
        shpLength = 100 + writer.shpLength(geometries, TYPE),
        // shxLength - the total length of the SHX file in 16-bit words (50 16-bit words plus 4 times the number of records)
        shxLength = 100 + writer.shxLength(geometries),
        shpBuffer = new ArrayBuffer(shpLength),
        shpView = new DataView(shpBuffer),
        shxBuffer = new ArrayBuffer(shxLength),
        shxView = new DataView(shxBuffer),
        extent = writer.extent(geometries);

    writeFileHeader(shpView, TYPE);
    writeFileHeader(shxView, TYPE);
    writeExtent(extent, shpView);
    writeExtent(extent, shxView);

    writer.write(geometries, extent,
        new DataView(shpBuffer, 100),
        new DataView(shxBuffer, 100),
        TYPE);

    // write file lengths to File headers
    // SHP content length - total length of the file in 16-bit words (including the fifty 16-bit words that make up the header)
    shpView.setInt32(24, shpLength / 2);
    // SHX content length - the 50 16-bit words plus 4 times the number of records
    shxView.setInt32(24, (50 + parts * 4));

    var dbfBuf = dbf.structure(rows);

    callback(null, {
        shp: shpView,
        shx: shxView,
        dbf: dbfBuf,
        prj: prj
    });
}

function writeFileHeader(view, TYPE) {
    view.setInt32(0, 9994);
    view.setInt32(28, 1000, true);
    view.setInt32(32, TYPE, true);
}

function writeExtent(extent, view) {
    view.setFloat64(36, extent.xmin, true);
    view.setFloat64(44, extent.ymin, true);
    view.setFloat64(52, extent.xmax, true);
    view.setFloat64(60, extent.ymax, true);
    view.setFloat64(68, extent.zmin, true);
    view.setFloat64(76, extent.zmax, true);
    view.setFloat64(84, extent.mmin, true);
    view.setFloat64(92, extent.mmax, true);
}
