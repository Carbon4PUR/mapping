// Adapted from https://github.com/mbostock/d3/blob/master/src/svg/axis.js
// forked from http://bl.ocks.org/aubergene/4723857
var circleLegend = function circleLegend() {
  'use strict';

  var scale,
  orient = 'left',
  tickPadding = 3,
  tickExtend = 5,
  tickArguments_ = [10],
  tickValues = null,
  tickFormat_,
  ε = 1e-6;


  function key(selection) {
    selection.each(function() {
      var g = d3.select(this);

      g.attr('class', 'circle-legend');

      // Stash a snapshot of the new scale, and retrieve the old snapshot.
      var scale0 = this.__chart__ || scale,
      scale1 = this.__chart__ = scale.copy();

      // Ticks, or domain values for ordinal scales.
      var ticks = tickValues == null ? (scale.ticks ? scale.ticks.apply(scale, tickArguments_) : scale.domain()) : tickValues,
      ticks = ticks.slice().filter(function(d) {
        return d > 0
      }).sort(d3.descending),
      tickFormat = tickFormat_ == null ? (scale.tickFormat ? scale.tickFormat.apply(scale, tickArguments_) : String) : tickFormat_,
      tick = g.selectAll('.tick').data(ticks, scale1),
      tickEnter = tick.enter().insert('g', '.tick').attr('class', 'tick').style('opacity', ε),
      tickExit = d3.transition(tick.exit()).style('opacity', ε).remove(),
      tickUpdate = d3.transition(tick.order()).style('opacity', 1),
      tickTransform;

      tickEnter.each(function(tick) {
        var gg = d3.select(this);

        var tickText = tickFormat(tick);

        if (!tickText) return;

        gg.append('circle')
        .attr('cx', 0)
        .attr('cy', 0)
        .attr('r', scale(tick));

        gg.append('line')
        .attr('y1', 0)
        .attr('y2', 0)
        .attr('stroke', '#000')
        .text(tick);

        gg.append('text')
        .attr('dy', '.35em')
        .style('text-anchor', 'left' == orient ? 'end' : 'start')
        .text(tickText);

      });
      tickEnter.call(d3_svg_legend, scale0);
      tickUpdate.call(d3_svg_legend, scale1);
      tickExit.call(d3_svg_legend, scale1);

      function d3_svg_legend(selection, scale) {
        selection.select('circle')
        .attr('r', scale);

        var x2 = scale(ticks[0]) + tickExtend;
        var sign = 'left' == orient ? -1 : 1;

        selection.select('text')
        .attr('transform', 'translate(' + (x2 + tickPadding) * sign + ', 0)');

        selection.select('line')
        .attr('x1', function(d) {
          return scale(d) * sign
        })
        .attr('x2', x2 * sign);

        selection.attr('transform', function(d) {
          return 'translate(0,' + -scale(d) + ')';
        });
      }

    });
  }

  key.scale = function(value) {
    if (!arguments.length) return scale;
    scale = value;
    return key;
  };

  key.orient = function(value) {
    if (!arguments.length) return orient;
    orient = value;
    return key;
  };

  key.ticks = function() {
    if (!arguments.length) return tickArguments_;
    tickArguments_ = arguments;
    return key;
  };

  key.tickFormat = function(x) {
    if (!arguments.length) return tickFormat_;
    tickFormat_ = x;
    return key;
  };

  key.tickValues = function(x) {
    if (!arguments.length) return tickValues;
    tickValues = x;
    return key;
  };

  key.tickPadding = function(x) {
    if (!arguments.length) return tickPadding;
    tickPadding = +x;
    return key;
  };

  key.tickExtend = function(x) {
    if (!arguments.length) return tickExtend;
    tickExtend = +x;
    return key;
  };

  key.width = function(value) {
    if (!arguments.length) return width;
    width = value;
    return key;
  };

  key.height = function(value) {
    if (!arguments.length) return height;
    height = value;
    return key;
  };

  return key;
};
